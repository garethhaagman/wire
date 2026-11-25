import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import type { ApiEnv } from "@wire/config";
import { Redis } from "ioredis";
import { API_ENV } from "../config/env.provider.js";

export const REDIS = Symbol("REDIS");

/**
 * Logs a failed Redis call unless the connection is down — an outage is already
 * reported once by the client's error handler, so per-call warnings would only
 * repeat it on every request.
 */
export function warnRedisFailure(
  redis: Redis,
  logger: Logger,
  context: string,
  err: unknown
): void {
  if (redis.status !== "ready") {
    return;
  }
  logger.warn(`${context}: ${describeRedisError(err as Error)}`);
}

/** Connection-refused errors are AggregateErrors (IPv4 + IPv6) with an empty message. */
export function describeRedisError(err: Error & { code?: string }): string {
  return err.message || err.code || err.name;
}

/**
 * Shared command connection. Redis holds only ephemeral or reconstructible state
 * (rate-limit windows, idempotency records, presence, cached lookups, pub/sub
 * fan-out) — Postgres stays the system of record, so a Redis flush degrades
 * latency, never correctness. Pub/sub subscribers use their own duplicate()
 * connection (see RealtimeService).
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (env: ApiEnv): Redis => {
        const logger = new Logger("Redis");
        // No offline queue: while disconnected, commands reject immediately so every
        // caller's fail-open path runs at once instead of stalling the request on
        // reconnect backoff.
        const client = new Redis(env.REDIS_URL, {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 2,
          enableAutoPipelining: true,
        });
        // ioredis emits an error per reconnect attempt; log the outage once and its recovery once.
        let down = false;
        client.on("error", (err: Error & { code?: string }) => {
          if (down) {
            return;
          }
          down = true;
          logger.warn(
            `redis unavailable (${describeRedisError(err)}) — degrading: rate limits, idempotency and caches are bypassed until it returns`
          );
        });
        client.on("ready", () => {
          if (down) {
            logger.log("redis reconnected");
          }
          down = false;
        });
        return client;
      },
      inject: [API_ENV],
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status === "ready") {
      await this.redis.quit();
    } else {
      this.redis.disconnect();
    }
  }
}
