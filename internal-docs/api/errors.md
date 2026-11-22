# Error codes

SDKs must never parse human-readable error messages to decide behavior. `error.code` is stable and machine-readable; `error.message` may change freely.

## Codes

| Code | Meaning | Typical status |
|------|---------|------------------|
| `VALIDATION_ERROR` | Invalid request fields | 400 / 422 |
| `AUTHENTICATION_ERROR` | Authentication failed | 401 |
| `PERMISSION_DENIED` | Insufficient permissions | 403 |
| `RESOURCE_NOT_FOUND` | Resource doesn't exist | 404 |
| `RESOURCE_CONFLICT` | Conflicting operation | 409 |
| `RATE_LIMIT_EXCEEDED` | Rate limit reached | 429 |
| `INTERNAL_ERROR` | Unexpected server error | 500 |
| `SERVICE_UNAVAILABLE` | Service unavailable | 503 |

Defined as `ApiErrorCode` in `@wire/types` (`packages/types/src/envelope.ts`) — adding a new code is a type change reviewers should treat as deliberate, not incidental.

## How a thrown error becomes a code

`apps/api/src/common/filters/api-exception.filter.ts` is the single place that maps a thrown exception to `{code, message, details}`:

1. **`ApiException` subclasses** (`apps/api/src/common/errors/api-exception.ts`) carry an explicit `ApiErrorCode` — use these when the default status-based mapping isn't precise enough, or when you need field-level `details` (e.g. `ValidationException`).
2. **Nest's built-in `HttpException`s** (`NotFoundException`, `ForbiddenException`, etc.) are mapped by HTTP status via `HTTP_STATUS_TO_ERROR_CODE` (`apps/api/src/common/errors/http-status-error-code.map.ts`). Prefer these when the status-based mapping is already correct — no need to reach for `ApiException` just to throw a 404.
3. **Anything else** (a bare `Error`, an unexpected exception) becomes `INTERNAL_ERROR` with status 500. `@wire/eslint-plugin-wire-api`'s `no-bare-error-throw` rule flags `throw new Error(...)` in `apps/api` for exactly this reason — it's almost never the status/code you actually want.

## Validation errors

`class-validator` failures are converted to `ValidationException` with per-field `details` by `apps/api/src/common/pipes/validation-exception-factory.ts`, wired as the global `ValidationPipe`'s `exceptionFactory`. Each detail entry is `{ field, code, message }` — `field` is the dotted path into the request body, `code` is the uppercased `class-validator` constraint name (e.g. `ISEMAIL`, `LENGTH`).
