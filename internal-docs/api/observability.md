# Observability (logging + OpenTelemetry)

Request logging and tracing are **framework defaults**. New endpoints get both
with zero per-handler code. Do not re-wire them on controllers.

## What you get automatically

| Signal      | Where          | What                                                                          |
| ----------- | -------------- | ----------------------------------------------------------------------------- |
| Access log  | turbo / stdout | One line per HTTP request: `METHOD path status durationMs request_id`         |
| Levels      | `LOG_LEVEL`    | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` (default `info`) |
| Traces      | OTEL SDK       | Auto-instrumented HTTP, Express, `pg`, `ioredis`, Nest                        |
| Correlation | span + log     | `X-Request-ID` / `meta.request_id` stamped on the active span                 |

Health checks (`GET /health`) log at `debug` so `info` stays scannable in turbo.

## Env

See `apps/api/.env.example`:

- `LOG_LEVEL`, default `info`
- `OTEL_SERVICE_NAME`, default `wire-api`
- `OTEL_EXPORTER_OTLP_ENDPOINT`, when set (e.g. `http://localhost:4318`), spans export over OTLP HTTP; when unset, instrumentation still runs but nothing is exported
- `OTEL_SDK_DISABLED=true`, skip starting the SDK entirely

Dev logs are pretty (human-readable for turbo). Production logs are JSON.

## Package boundary

Shared Node plumbing lives in `@wire/observability` (`packages/observability`):

- `createPinoLogger` / `PinoNestLogger`, levels + Nest `LoggerService`
- `startTelemetry` / `shutdownTelemetry`, NodeSDK + auto-instrumentations
- `trace` / `SpanStatusCode`, rare custom span enrichment

Nest wiring (global interceptor, bootstrap order) stays in `apps/api`:

- `instrumentation.ts` - start OTEL as the first import from `main.ts` (before Nest/DB load)
- `main.ts` - install pino logger, listen, graceful shutdown
- `AppModule` - registers `RequestLoggingMiddleware` globally (middleware so 401s from guards still log)
- `ApiExceptionFilter` - 5xx → span error + `request_id` in the log line

## What to do in new code

- **Controllers / services:** nothing for request lifecycle. Nest's
  `new Logger(MyService.name)` is fine for rare domain `warn` / `error` events
  (email failure, agent run crash). Do not log every successful CRUD at `info`.
- **Never** `console.log` / `console.warn` / etc. in `src/` (lint:
  `wire-api/no-console-logging`).
- **Never** re-apply `RequestLoggingMiddleware` / logging interceptors, or start
  an OTEL SDK from a feature module (lint: `wire-api/no-manual-observability`).
- Custom spans only when auto-instrumentation cannot see the work (e.g. a pure
  CPU job). Prefer `trace.getTracer('wire-api')` from `@wire/observability`, not
  a private SDK.

## Lint

`@wire/eslint-plugin-wire-api`:

- `no-console-logging`, ban `console.*` under `apps/api/src` (bootstrap
  `main.ts` and `scripts/` exempt)
- `no-manual-observability`, ban per-route logging/tracing interceptors and
  DIY `@opentelemetry/sdk-*` / exporter imports outside bootstrap
