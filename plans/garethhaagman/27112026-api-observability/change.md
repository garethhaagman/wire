# Automatic API logging + OpenTelemetry

**Date:** 27 November 2026
**Author:** garethhaagman
**Type:** architectural-decision

## Description of change

The API now logs every HTTP request automatically and traces every route with OpenTelemetry.
New endpoints need no observability code. Shared plumbing lives in `@wire/observability`.

## Implementation details

- `packages/observability`, pino logger + Nest `LoggerService` adapter, OTEL NodeSDK with auto-instrumentations (HTTP, Express, pg, ioredis, Nest)
- `packages/config` `api-env`, `LOG_LEVEL`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SDK_DISABLED`
- `apps/api/src/main.ts`, starts OTEL before Nest, installs pino logger, graceful shutdown
- `apps/api` `RequestLoggingMiddleware` on every route (one access line per request, including guard 401s; health at debug)
- `ApiExceptionFilter`, stamps active span with `request_id` / 5xx error status
- `wire-api/no-console-logging` and `wire-api/no-manual-observability` eslint rules
- `internal-docs/api/observability.md` + api-design skill checklist / lint list

## Trade-offs

- **Chosen:** one `@wire/observability` package for logging + tracing together, so log/trace correlation stays one import path. Nest-specific interceptor stays in `apps/api` because it depends on Express request types and global interceptor registration.
- **Rejected:** separate `@wire/logger` and `@wire/otel` packages, extra package churn for tightly coupled concerns.
- **Rejected:** per-controller logging/tracing decorators, conflicts with the existing "build conventions into the framework" rule (envelope, request id, permissions lint).
- **Rejected:** always exporting spans to console in dev, too noisy next to turbo; export only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Access logs cover the turbo visibility need.

## User input

User asked for minimal leveled logging visible in the turbo stack, full OpenTelemetry for all endpoints, packages if best practice, and lint/skills so new API work stays wired automatically:

> "can we add minimal logging. use best practices do not over log make sure there are different levels. right now when i see the turubo stack i dont see in the backend actions taken on the api which would be useful.
> also wire full opentelemetry for all endpoints, wire across everything best practices. if its best practice to hav ethis as a separate package then do that (same with logging idk). we should enforce that when new things are created in the api they need to be wired with otel with lint rules and skills"

Follow-up: logging must be automatic like OTEL:

> "same with logging make this automatic"
