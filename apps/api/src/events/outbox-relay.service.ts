import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import type { Redis } from "ioredis";
import { API_VERSION, type ApiEnv } from "@wire/config";
import {
  claimUnpublishedEvents,
  Database,
  enqueueWebhookDeliveries,
  markEventsPublished,
  pruneEvents,
} from "@wire/db";
import type { WireEvent } from "@wire/types";
import { RepeatErrorLogger } from "../common/logging/repeat-error-logger.js";
import { API_ENV } from "../config/env.provider.js";
import { REDIS, warnRedisFailure } from "../redis/redis.module.js";
import { workspaceChannel, type RealtimeEnvelope } from "./realtime-channel.js";

const BATCH_SIZE = 500;
const POLL_INTERVAL_MS = 200;
const PRUNE_INTERVAL_MS = 10 * 60_000;
/** Replay window for SSE resume / GET .../events. */
const EVENT_RETENTION_SECONDS = 7 * 24 * 60 * 60;

/**
 * Transactional-outbox relay. Mutations write `events` rows in their own
 * transaction; this moves committed rows to Redis pub/sub (realtime fan-out) and
 * to webhook delivery jobs. Every replica may run it: SKIP LOCKED partitions the
 * backlog between them.
 *
 * Delivery is at-least-once. Realtime publish is best-effort — if Redis is down
 * the events are still marked published (webhooks still get them, and SSE clients
 * catch up from Postgres via Last-Event-ID when they reconnect), so a Redis outage
 * can never back up the outbox.
 */
@Injectable()
export class OutboxRelayService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly errors = new RepeatErrorLogger(this.logger, "outbox relay failed");
  private readonly enabled: boolean;
  private draining = false;
  private pending = false;
  private stopped = false;
  private timers: NodeJS.Timeout[] = [];

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(API_ENV) env: ApiEnv,
  ) {
    this.enabled = env.RUN_WORKERS;
  }

  onApplicationBootstrap(): void {
    if (!this.enabled) return;
    this.timers.push(setInterval(() => this.kick(), POLL_INTERVAL_MS));
    this.timers.push(setInterval(() => void this.prune(), PRUNE_INTERVAL_MS));
    this.kick();
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    for (const timer of this.timers) clearInterval(timer);
  }

  /** Called after a mutation commits so its events go out now instead of on the next poll. */
  kick(): void {
    if (!this.enabled || this.stopped) return;
    if (this.draining) {
      this.pending = true;
      return;
    }
    void this.drain();
  }

  private async drain(): Promise<void> {
    this.draining = true;
    try {
      do {
        this.pending = false;
        const relayed = await this.relayBatch();
        if (relayed === BATCH_SIZE) this.pending = true;
      } while (this.pending && !this.stopped);
      this.errors.reset();
    } catch (err) {
      this.errors.error(err);
    } finally {
      this.draining = false;
    }
  }

  private relayBatch(): Promise<number> {
    return this.db.tx(async (tx) => {
      const events = await claimUnpublishedEvents(tx, BATCH_SIZE);
      if (events.length === 0) return 0;

      await this.publish(events);
      await enqueueWebhookDeliveries(tx, events, API_VERSION);
      await markEventsPublished(
        tx,
        events.map((e) => e.seq),
      );
      return events.length;
    });
  }

  private async publish(events: WireEvent[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      for (const event of events) {
        const envelope: RealtimeEnvelope = { kind: "event", event };
        pipeline.publish(workspaceChannel(event.workspaceId), JSON.stringify(envelope));
      }
      await pipeline.exec();
    } catch (err) {
      warnRedisFailure(
        this.redis,
        this.logger,
        "realtime publish failed (clients will resync on reconnect)",
        err,
      );
    }
  }

  private async prune(): Promise<void> {
    try {
      while (!this.stopped && (await pruneEvents(this.db, EVENT_RETENTION_SECONDS, 5000)) > 0) {
        // keep deleting in bounded batches
      }
    } catch (err) {
      this.logger.warn(`event retention prune failed: ${(err as Error).message}`);
    }
  }
}
