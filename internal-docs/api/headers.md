# Headers

## General headers

| Header            | Direction | Purpose                                                                            |
| ----------------- | --------- | ---------------------------------------------------------------------------------- |
| `Content-Type`    | Both      | `application/json`                                                                 |
| `Authorization`   | Request   | Bearer token                                                                       |
| `X-Request-ID`    | Both      | Request tracing — client may supply one, server mints one if absent, always echoed |
| `X-API-Version`   | Response  | The major API version that served the request (`v1`)                               |
| `Idempotency-Key` | Request   | Duplicate-execution protection on mutating endpoints                               |

Implementation: `RequestIdMiddleware` (`apps/api/src/common/middleware/request-id.middleware.ts`) handles `X-Request-ID`; `ResponseEnvelopeInterceptor` sets `X-API-Version` on every response.

## Deprecation headers

When a route is marked `@Deprecated()`, every response from it carries:

```http
Deprecation: @1798761600
Sunset: Tue, 30 Jun 2027 23:59:59 GMT
Link: <https://docs.wire.example/migrations/v1-workspaces>; rel="deprecation"
```

| Header        | Purpose                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Deprecation` | Unix timestamp (seconds) of when the route became deprecated — [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745) |
| `Sunset`      | HTTP-date the route stops being served — [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594)                       |
| `Link`        | Points to migration documentation; never a substitute for it                                                      |

Implementation: `@Deprecated({ since, sunset, migrationUrl })` decorator + `DeprecationHeadersInterceptor` (`apps/api/src/common/decorators/deprecated.decorator.ts`, `apps/api/src/common/interceptors/deprecation-headers.interceptor.ts`). See [versioning.md](./versioning.md) for the full lifecycle.

## Rate limiting and retry headers

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Limit: 1000
RateLimit-Remaining: 0
RateLimit-Reset: 30
```

| Header                | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `Retry-After`         | Seconds (or an HTTP date) the client should wait before retrying |
| `RateLimit-Limit`     | Maximum requests allowed in the current window                   |
| `RateLimit-Remaining` | Requests remaining in the current window                         |
| `RateLimit-Reset`     | Seconds until the window resets                                  |

`RateLimit-*` headers are set on **every** response, not just 429s, so clients can monitor their remaining quota proactively.

Implementation: `RateLimitMiddleware` (`apps/api/src/common/middleware/rate-limit.middleware.ts`) — a fixed-window limiter in Redis (one atomic Lua `INCR`+`PEXPIRE`), shared across every API replica. Keyed by session (hashed cookie) when present, else IP; `RATE_LIMIT_PER_MINUTE` (default 1000). It fails open — a Redis outage disables limiting rather than the API.

### SDK retry behavior

- Automatically respect `Retry-After`.
- Never retry indefinitely — apply a maximum retry count.
- Use exponential backoff with jitter for retries not driven by `Retry-After`.
- Retry only requests that are safe to retry (idempotent, or carrying an `Idempotency-Key`).

## Idempotency

```http
POST /v1/workspaces
Idempotency-Key: a-client-generated-uuid
```

A repeated request with the same key and route returns the original response instead of executing again. Implementation: `IdempotencyInterceptor` (`apps/api/src/common/interceptors/idempotency.interceptor.ts`), applied per-route via `@UseInterceptors()` on mutating endpoints — not global, since it only matters where duplicate execution is a real risk. Stored in Redis, scoped per user + method + path, 24h TTL. A request is first claimed with an atomic `SET NX` in-flight marker, so two concurrent requests with the same key can't both execute — the second gets `409` until the first finishes, then replays its response. A failed request releases the key so the client can retry.
