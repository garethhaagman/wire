import { HttpStatus, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { API_VERSION } from "@wire/config";
import type { ApiResponse } from "@wire/types";
import type { RequestWithId } from "./request-id.middleware.js";

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const LIMIT = 1000;

/**
 * Minimal in-memory, per-IP fixed-window limiter. Real production rate limiting
 * needs a shared store (Redis) across instances — this is a dev-scope stand-in
 * that enforces the real contract (headers + 429 + Retry-After) so SDKs can be
 * built and tested against correct behavior before that infra exists. See
 * internal-docs/api/rate-limiting.md.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, Bucket>();

  use(req: Request, res: Response, next: NextFunction): void {
    const key = req.ip ?? "unknown";
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + WINDOW_MS };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, LIMIT - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", LIMIT);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSeconds);

    if (bucket.count > LIMIT) {
      res.setHeader("Retry-After", resetSeconds);
      const body: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Retry after the window resets.",
        },
        meta: {
          request_id: (req as RequestWithId).requestId ?? "req_unknown",
          api_version: API_VERSION,
        },
      };
      res.status(HttpStatus.TOO_MANY_REQUESTS).json(body);
      return;
    }

    next();
  }
}
