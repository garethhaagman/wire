import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import type { Redis } from "ioredis";
import { catchError, from, mergeMap, of, type Observable } from "rxjs";
import type { AuthedRequest } from "../../auth/session.guard.js";
import { REDIS, warnRedisFailure } from "../../redis/redis.module.js";
import { ApiException } from "../errors/api-exception.js";

const TTL_SECONDS = 24 * 60 * 60;
/** How long an in-flight claim blocks duplicates before a crashed request's key frees up. */
const IN_FLIGHT_TTL_SECONDS = 60;
const IN_FLIGHT = "__in_flight__";

/**
 * Replays the original response for a repeated Idempotency-Key on the same route
 * — internal-docs/api/headers.md. Shared across replicas via Redis:
 *
 * 1. `SET key IN_FLIGHT NX EX 60` atomically claims the key — exactly one of N
 *    concurrent duplicates executes;
 * 2. a duplicate arriving mid-flight gets 409 (retry later), one arriving after
 *    completion gets the stored response;
 * 3. a failed request releases the key so the client can retry.
 *
 * Keys are scoped per user, so one caller can never replay another's response.
 * If Redis is unavailable the request executes without protection (fail open).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) return next.handle();

    if (idempotencyKey.length > 255) {
      throw new ApiException(
        "VALIDATION_ERROR",
        "Idempotency-Key must be at most 255 characters.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const userId = req.session?.user.id ?? "anonymous";
    const key = `wire:idem:${userId}:${req.method}:${req.path}:${idempotencyKey}`;

    return from(this.claim(key)).pipe(
      mergeMap((state) => {
        if (state.kind === "replay") return of(state.response);
        if (state.kind === "in_flight") {
          throw new ApiException(
            "RESOURCE_CONFLICT",
            "A request with this Idempotency-Key is still being processed.",
            HttpStatus.CONFLICT,
          );
        }

        return next.handle().pipe(
          mergeMap((response: unknown) =>
            from(
              this.redis
                .set(key, JSON.stringify({ response }), "EX", TTL_SECONDS)
                .catch((err: Error) =>
                  warnRedisFailure(this.redis, this.logger, "idempotency store failed", err),
                ),
            ).pipe(mergeMap(() => of(response))),
          ),
          catchError((err: unknown) =>
            from(this.redis.del(key).catch(() => 0)).pipe(
              mergeMap(() => {
                throw err;
              }),
            ),
          ),
        );
      }),
    );
  }

  private async claim(
    key: string,
  ): Promise<{ kind: "execute" } | { kind: "in_flight" } | { kind: "replay"; response: unknown }> {
    try {
      const claimed = await this.redis.set(key, IN_FLIGHT, "EX", IN_FLIGHT_TTL_SECONDS, "NX");
      if (claimed === "OK") return { kind: "execute" };
      const existing = await this.redis.get(key);
      if (existing === null) return { kind: "execute" };
      if (existing === IN_FLIGHT) return { kind: "in_flight" };
      return { kind: "replay", response: (JSON.parse(existing) as { response: unknown }).response };
    } catch (err) {
      warnRedisFailure(
        this.redis,
        this.logger,
        "idempotency store unavailable, executing without it",
        err,
      );
      return { kind: "execute" };
    }
  }
}
