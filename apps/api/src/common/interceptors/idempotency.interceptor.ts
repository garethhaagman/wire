import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { of, tap, type Observable } from "rxjs";

interface CacheEntry {
  response: unknown;
  expiresAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Caches the response for a given Idempotency-Key + route so a retried POST
 * returns the original result instead of executing twice — internal-docs/api/headers.md.
 * In-memory, single-instance stand-in; production needs a shared store (Redis) once
 * there's more than one API instance.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, CacheEntry>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.header("Idempotency-Key");

    if (!key) return next.handle();

    const cacheKey = `${req.method} ${req.path} ${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.response);
    }

    return next.handle().pipe(
      tap((response) => {
        this.cache.set(cacheKey, { response, expiresAt: Date.now() + TTL_MS });
      }),
    );
  }
}
