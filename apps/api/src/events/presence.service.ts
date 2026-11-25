import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { PresenceEntry } from "@wire/types";
import { REDIS, warnRedisFailure } from "../redis/redis.module.js";
import { workspaceChannel, type RealtimeEnvelope } from "./realtime-channel.js";

/** A member is "active" if they heartbeated within this window. */
const ACTIVE_WINDOW_MS = 60_000;
const TYPING_THROTTLE_MS = 3_000;

/**
 * Records the heartbeat and reports whether this is an offline→online transition,
 * atomically — so concurrent heartbeats from several devices publish one event.
 */
const HEARTBEAT_SCRIPT = `
local previous = redis.call('ZSCORE', KEYS[1], ARGV[1])
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[4])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', tonumber(ARGV[2]) - tonumber(ARGV[4]))
if (not previous) or (tonumber(ARGV[2]) - tonumber(previous) > tonumber(ARGV[3])) then return 1 end
return 0
`;

function presenceKey(workspaceId: string): string {
  return `wire:presence:${workspaceId}`;
}

/**
 * Ephemeral presence and typing — never written to Postgres or the event outbox
 * (internal-docs/api/events-webhooks.md § Realtime presence). Presence is a sorted
 * set of memberId → last heartbeat per workspace.
 */
@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async heartbeat(workspaceId: string, memberId: string): Promise<void> {
    const now = Date.now();
    try {
      const cameOnline = await this.redis.eval(
        HEARTBEAT_SCRIPT,
        1,
        presenceKey(workspaceId),
        memberId,
        now,
        ACTIVE_WINDOW_MS,
        24 * 60 * 60_000,
      );
      if (cameOnline === 1) {
        await this.publish({
          kind: "ephemeral",
          type: "presence.online",
          workspaceId,
          channelId: null,
          data: { memberId, lastSeenAt: new Date(now).toISOString() },
        });
      }
    } catch (err) {
      warnRedisFailure(this.redis, this.logger, "presence heartbeat failed", err);
    }
  }

  async listActive(workspaceId: string): Promise<PresenceEntry[]> {
    const raw = await this.redis.zrangebyscore(
      presenceKey(workspaceId),
      Date.now() - ACTIVE_WINDOW_MS,
      "+inf",
      "WITHSCORES",
    );
    const entries: PresenceEntry[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({
        memberId: raw[i]!,
        status: "active",
        lastSeenAt: new Date(Number(raw[i + 1])).toISOString(),
      });
    }
    return entries;
  }

  /** Throttled per member+channel so a fast typist produces one signal every few seconds. */
  async typing(
    workspaceId: string,
    channelId: string,
    memberId: string,
    threadRootId: string | null,
  ): Promise<void> {
    const acquired = await this.redis.set(
      `wire:typing:${channelId}:${memberId}`,
      "1",
      "PX",
      TYPING_THROTTLE_MS,
      "NX",
    );
    if (acquired !== "OK") return;
    await this.publish({
      kind: "ephemeral",
      type: "typing",
      workspaceId,
      channelId,
      data: { memberId, threadRootId },
    });
  }

  private async publish(envelope: Extract<RealtimeEnvelope, { kind: "ephemeral" }>): Promise<void> {
    await this.redis.publish(workspaceChannel(envelope.workspaceId), JSON.stringify(envelope));
  }
}
