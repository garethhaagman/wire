import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";
import type { Redis } from "ioredis";
import { Database, findChannelRecord, listChannelMemberIds, listEventsAfter } from "@wire/db";
import type { Channel, WireEvent } from "@wire/types";
import { LruCache } from "../common/cache/lru-cache.js";
import type { WorkspaceActor } from "../permissions/actor.js";
import { describeRedisError, REDIS } from "../redis/redis.module.js";
import { PresenceService } from "./presence.service.js";
import { workspaceChannel, type RealtimeEnvelope } from "./realtime-channel.js";

export const HEARTBEAT_MS = 15_000;
const MEMBERSHIP_TTL_MS = 30_000;
/** A client this far behind is told to resync from the REST API instead of replaying. */
const MAX_REPLAY_EVENTS = 5000;
const REPLAY_PAGE = 500;

const MEMBERSHIP_EVENTS = new Set(["channel.member.joined", "channel.member.left"]);

export interface StreamFilters {
  types: Set<string> | null;
  channelIds: Set<string> | null;
  afterSeq: number | null;
}

/**
 * Transport-specific wire encoding and backpressure, implemented once per
 * transport (SSE: sse-sink.ts; WS: ws-sink.ts). RealtimeService only ever
 * calls through this — it has no notion of either transport's frame format,
 * so ACL/audience/replay logic (the part that matters for correctness) lives
 * in exactly one place regardless of how many transports exist.
 */
export interface StreamSink {
  readonly ended: boolean;
  sendEvent(event: WireEvent): void;
  sendEphemeral(type: string, channelId: string | null, data: Record<string, unknown>): void;
  sendResync(): void;
  ping(): void;
  end(): void;
}

interface Connection {
  id: string;
  workspaceId: string;
  memberId: string;
  isGuest: boolean;
  sink: StreamSink;
  filters: StreamFilters;
  /** Live events that arrive while the backlog replays; flushed (deduped by seq) afterwards. */
  backlog: WireEvent[] | null;
  lastSeq: number;
}

/**
 * Realtime fan-out core, shared by every transport. Topology:
 *
 *   outbox relay ──PUBLISH wire:ws:{id}──▶ Redis ──▶ every replica subscribed to that workspace
 *                                                     └─▶ local connections, ACL-filtered per channel
 *
 * Each replica holds one subscriber connection and subscribes only to workspaces
 * that have at least one open stream on it, so per-replica work scales with its
 * own connections, not with total traffic. Channel type is immutable and cached
 * forever; channel membership sets are cached briefly and invalidated by the
 * membership events flowing through the same stream.
 */
@Injectable()
export class RealtimeService implements OnApplicationShutdown {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly byWorkspace = new Map<string, Set<Connection>>();
  private readonly channelTypes = new LruCache<string, Channel["type"]>(100_000);
  private readonly channelMembers = new Map<
    string,
    { members: Promise<Set<string>>; expiresAt: number }
  >();
  private subscriber: Redis | null = null;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(Database) private readonly db: Database,
    private readonly presence: PresenceService,
  ) {}

  /**
   * Registers a connection against a sink the caller already created and
   * attached (SSE has already written response headers; WS has already
   * accepted the upgrade). Replays from `filters.afterSeq` if set, then
   * leaves the connection attached until `close()` is called.
   */
  async attachSink(
    actor: WorkspaceActor,
    sink: StreamSink,
    filters: StreamFilters,
  ): Promise<{ close: () => void }> {
    const conn: Connection = {
      id: randomUUID(),
      workspaceId: actor.workspaceId,
      memberId: actor.member.id,
      isGuest: actor.member.role === "guest",
      sink,
      filters,
      backlog: filters.afterSeq !== null ? [] : null,
      lastSeq: filters.afterSeq ?? 0,
    };

    await this.attach(conn);
    void this.presence.heartbeat(actor.workspaceId, actor.member.id);

    if (filters.afterSeq !== null) await this.replay(conn, filters.afterSeq);

    return { close: () => void this.detach(conn) };
  }

  /** Heartbeat tick for a still-open connection — called by the transport on its own timer. */
  heartbeat(actor: WorkspaceActor): void {
    void this.presence.heartbeat(actor.workspaceId, actor.member.id);
  }

  /** Ends every open stream for a member (e.g. after removal from the workspace). */
  disconnectMember(workspaceId: string, memberId: string): void {
    for (const conn of this.byWorkspace.get(workspaceId) ?? []) {
      if (conn.memberId === memberId) conn.sink.end();
    }
  }

  onApplicationShutdown(): void {
    for (const conns of this.byWorkspace.values()) for (const conn of conns) conn.sink.end();
    this.byWorkspace.clear();
    if (this.subscriber) this.subscriber.disconnect();
  }

  private async attach(conn: Connection): Promise<void> {
    let conns = this.byWorkspace.get(conn.workspaceId);
    if (!conns) {
      conns = new Set();
      this.byWorkspace.set(conn.workspaceId, conns);
      await this.ensureSubscriber()
        .subscribe(workspaceChannel(conn.workspaceId))
        .catch((err: Error) => this.logger.warn(`subscribe failed: ${err.message}`));
    }
    conns.add(conn);
  }

  private async detach(conn: Connection): Promise<void> {
    const conns = this.byWorkspace.get(conn.workspaceId);
    if (!conns) return;
    conns.delete(conn);
    if (conns.size === 0) {
      this.byWorkspace.delete(conn.workspaceId);
      await this.subscriber
        ?.unsubscribe(workspaceChannel(conn.workspaceId))
        .catch((err: Error) => this.logger.warn(`unsubscribe failed: ${err.message}`));
    }
  }

  private ensureSubscriber(): Redis {
    if (this.subscriber) return this.subscriber;
    // Queued while disconnected: ioredis only re-subscribes channels whose SUBSCRIBE
    // was accepted, so a rejected one would be lost for good after a reconnect.
    const subscriber = this.redis.duplicate({ lazyConnect: false, enableOfflineQueue: true });
    subscriber.on("message", (_channel: string, payload: string) => {
      void this.onMessage(payload).catch((err: Error) =>
        this.logger.warn(`dispatch failed: ${err.message}`),
      );
    });
    let down = false;
    subscriber.on("error", (err: Error) => {
      if (!down) this.logger.warn(`realtime subscriber unavailable: ${describeRedisError(err)}`);
      down = true;
    });
    subscriber.on("ready", () => {
      down = false;
    });
    this.subscriber = subscriber;
    return subscriber;
  }

  private async onMessage(payload: string): Promise<void> {
    const envelope = JSON.parse(payload) as RealtimeEnvelope;
    if (envelope.kind === "ephemeral") {
      await this.dispatchEphemeral(envelope);
      return;
    }

    const event = envelope.event;
    if (event.channelId && MEMBERSHIP_EVENTS.has(event.type))
      this.channelMembers.delete(event.channelId);
    if (event.type === "member.removed") {
      this.disconnectMember(
        event.workspaceId,
        String((event.data as { memberId?: string }).memberId),
      );
    }

    const conns = this.byWorkspace.get(event.workspaceId);
    if (!conns) return;
    const audience = await this.audienceFor(event.channelId, event, conns);
    for (const conn of conns) {
      if (conn.backlog) {
        conn.backlog.push(event);
        continue;
      }
      if (this.visible(conn, event.type, event.channelId, audience)) this.sendEvent(conn, event);
    }
  }

  private async dispatchEphemeral(
    envelope: Extract<RealtimeEnvelope, { kind: "ephemeral" }>,
  ): Promise<void> {
    const conns = this.byWorkspace.get(envelope.workspaceId);
    if (!conns) return;
    const audience = await this.audienceFor(envelope.channelId, null, conns);
    for (const conn of conns) {
      if (this.visible(conn, envelope.type, envelope.channelId, audience)) {
        conn.sink.sendEphemeral(envelope.type, envelope.channelId, envelope.data);
      }
    }
  }

  /**
   * Who may see a channel-scoped event: `public` (any non-guest), or an explicit
   * member set. A member who just left still receives their own `left` event.
   */
  private async audienceFor(
    channelId: string | null,
    event: WireEvent | null,
    conns: Iterable<Connection>,
  ): Promise<{ type: Channel["type"] | null; members: Set<string> | null; extra: string | null }> {
    if (!channelId) return { type: null, members: null, extra: null };
    const type = await this.channelType(channelId);
    // Public channels only need the member set when a guest is listening — large
    // public channels would otherwise reload huge sets for no benefit.
    const needsMembers = type !== "public" || [...conns].some((c) => c.isGuest);
    const members = needsMembers ? await this.membersOf(channelId) : null;
    const extra =
      event?.type === "channel.member.left"
        ? String((event.data as { memberId?: string }).memberId)
        : null;
    return { type, members, extra };
  }

  private visible(
    conn: Connection,
    type: string,
    channelId: string | null,
    audience: { type: Channel["type"] | null; members: Set<string> | null; extra: string | null },
  ): boolean {
    if (conn.filters.types && !conn.filters.types.has(type)) return false;
    if (channelId && conn.filters.channelIds && !conn.filters.channelIds.has(channelId))
      return false;
    if (!channelId) return true;
    if (audience.extra === conn.memberId) return true;
    if (audience.type === "public" && !conn.isGuest) return true;
    return audience.members?.has(conn.memberId) ?? false;
  }

  private async replay(conn: Connection, afterSeq: number): Promise<void> {
    let cursor = afterSeq;
    let sent = 0;
    for (;;) {
      const page = await listEventsAfter(this.db, {
        workspaceId: conn.workspaceId,
        afterSeq: cursor,
        limit: REPLAY_PAGE,
        viewerMemberId: conn.memberId,
        viewerIsGuest: conn.isGuest,
      });
      for (const event of page.items) {
        const audience = await this.audienceFor(event.channelId, event, [conn]);
        if (this.visible(conn, event.type, event.channelId, audience)) this.sendEvent(conn, event);
        cursor = event.seq;
      }
      sent += page.items.length;
      if (!page.hasMore) break;
      if (sent >= MAX_REPLAY_EVENTS) {
        conn.sink.sendResync();
        break;
      }
    }

    const backlog = conn.backlog ?? [];
    conn.backlog = null;
    for (const event of backlog) {
      if (event.seq <= conn.lastSeq) continue;
      const audience = await this.audienceFor(event.channelId, event, [conn]);
      if (this.visible(conn, event.type, event.channelId, audience)) this.sendEvent(conn, event);
    }
  }

  private sendEvent(conn: Connection, event: WireEvent): void {
    if (conn.sink.ended) return;
    if (event.seq > conn.lastSeq) conn.lastSeq = event.seq;
    conn.sink.sendEvent(event);
  }

  private async channelType(channelId: string): Promise<Channel["type"] | null> {
    const cached = this.channelTypes.get(channelId);
    if (cached) return cached;
    const channel = await findChannelRecord(this.db, channelId);
    if (!channel) return null;
    this.channelTypes.set(channelId, channel.type);
    return channel.type;
  }

  private membersOf(channelId: string): Promise<Set<string>> {
    const now = Date.now();
    const cached = this.channelMembers.get(channelId);
    if (cached && cached.expiresAt > now) return cached.members;

    const members = listChannelMemberIds(this.db, channelId).then((ids) => new Set(ids));
    this.channelMembers.set(channelId, { members, expiresAt: now + MEMBERSHIP_TTL_MS });
    members.catch(() => this.channelMembers.delete(channelId));
    if (this.channelMembers.size > 50_000) this.evictExpired(now);
    return members;
  }

  private evictExpired(now: number): void {
    for (const [key, value] of this.channelMembers)
      if (value.expiresAt <= now) this.channelMembers.delete(key);
  }
}
