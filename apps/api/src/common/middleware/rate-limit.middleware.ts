import { createHash } from "node:crypto";
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type NestMiddleware,
} from "@nestjs/common";
import { API_VERSION, type ApiEnv } from "@wire/config";
import type { ApiResponse } from "@wire/types";
import type { NextFunction, Request, Response } from "express";
import type { Redis } from "ioredis";
import { API_ENV } from "../../config/env.provider.js";
import { REDIS, warnRedisFailure } from "../../redis/redis.module.js";
import type { RequestWithId } from "./request-id.middleware.js";

const WINDOW_MS = 60_000;
const SESSION_COOKIE = "better-auth.session_token";

/** INCR + first-hit PEXPIRE in one atomic step, so the window can't be left without a TTL. */
const FIXED_WINDOW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`;

/**
 * Fixed-window limiter shared across every API replica via Redis. Keyed by
 * session (hashed cookie) when present so users behind one NAT don't share a
 * budget, else by IP. Fails open: if Redis is unavailable requests are served
 * without limiting rather than taking the API down with it.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly limit: number;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(API_ENV) env: ApiEnv
  ) {
    this.limit = env.RATE_LIMIT_PER_MINUTE;
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    let count: number;
    let ttlMs: number;
    try {
      const result = (await this.redis.eval(
        FIXED_WINDOW_SCRIPT,
        1,
        this.key(req),
        WINDOW_MS
      )) as [number, number];
      [count, ttlMs] = result;
    } catch (err) {
      warnRedisFailure(
        this.redis,
        this.logger,
        "rate limiter unavailable, failing open",
        err
      );
      next();
      return;
    }

    const remaining = Math.max(0, this.limit - count);
    const resetSeconds = Math.max(
      1,
      Math.ceil((ttlMs > 0 ? ttlMs : WINDOW_MS) / 1000)
    );

    res.setHeader("RateLimit-Limit", this.limit);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSeconds);

    if (count > this.limit) {
      res.setHeader("Retry-After", resetSeconds);
      const body: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Retry after the window resets.",
        },
        meta: {
          request_id: (req as RequestWithId).requestId,
          api_version: API_VERSION,
        },
      };
      res.status(HttpStatus.TOO_MANY_REQUESTS).json(body);
      return;
    }

    next();
  }

  private key(req: Request): string {
    const cookie = req.headers.cookie ?? "";
    const token = cookie
      .split(";")
      .map((part) => part.trim())
      .find(
        (part) =>
          part.startsWith(`${SESSION_COOKIE}=`) ||
          part.startsWith(`__Secure-${SESSION_COOKIE}=`)
      );
    if (token) {
      return `wire:rl:s:${createHash("sha256").update(token).digest("base64url").slice(0, 22)}`;
    }
    return `wire:rl:ip:${req.ip ?? "unknown"}`;
  }
}
