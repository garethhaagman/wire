---
name: api-design
description: >-
  Use when adding, changing, or reviewing any endpoint in apps/api — a new
  resource controller, a new DTO, a new error case, or anything touching the HTTP
  surface. Also use when asked about Wire's API conventions, response envelope,
  error codes, pagination, headers, OpenAPI spec generation, request logging,
  OpenTelemetry, or the local Grafana stack.
version: "1.7.0"
---

# Wire API design

Every endpoint in `apps/api` follows one set of conventions so an SDK only ever needs one generic HTTP handler. The full reasoning lives in `internal-docs/api/`, this skill is the condensed, actionable version for building a new endpoint correctly on the first pass.

**The OpenAPI spec (`internal-docs/api/openapi.yaml`) is generated, never hand-edited.** It's produced by `apps/api/scripts/export-openapi.ts` from `@nestjs/swagger` decorators on the real controllers. After adding or changing a controller/DTO, regenerate it:

```sh
cd apps/api && DATABASE_URL=... bun run openapi:export
```

## Adding a new resource, checklist

Use `internal-docs/api/workspaces` (well, `apps/api/src/workspaces/`) as the reference shape. For a resource `Foo`:

1. **Types** (`packages/types/src/foo.ts`): `Foo` interface with a prefixed string-literal `id` (`` `foo_${string}` ``), `CreateFooRequest`. Export from `packages/types/src/index.ts`.
2. **DTOs** (`apps/api/src/foo/dto/foo.dto.ts`): a Swagger-only class per type implementing the `@wire/types` interface, decorated with `@ApiProperty()`. The request DTO gets `class-validator` decorators (`@IsString()`, `@Length()`, etc.), this is what actually validates incoming requests via the global `ValidationPipe`. See "DTO examples" below, every `@ApiProperty` needs a concrete example/enum/typed reference, not just a bare type.
3. **Service** (`apps/api/src/foo/foo.service.ts`): business logic. Throw `NotFoundException` (or other Nest built-ins) for the common cases; throw `ApiException` subclasses only when the default status→code mapping isn't precise enough (see Errors below).
4. **Controller** (`apps/api/src/foo/foo.controller.ts`): see Naming & verbs below for method names, URL shape, and the required decorators.
5. **Permissions**: add `"Foo"` to `PermissionSubject` in `apps/api/src/permissions/permission.types.ts`, decide which actions `member` gets in `ability.factory.ts` (admin always gets everything via `manage all`), then put `@RequirePermission(action, "Foo")` on every handler, see Permissions below.
6. **Module**: wire controller + service, import into `AppModule`.
7. **Observability**: do nothing per endpoint for request lifecycle. Access logs and OTEL spans are global. Only add Nest `Logger` `warn`/`error` for unusual domain failures (caught email send, agent run crash). Never `console.*`, never per-route logging/tracing. Full detail below and in `internal-docs/api/observability.md`.
8. **Regenerate the OpenAPI spec** and commit the diff alongside the code change.

## Versioning

URL-based major versions only (`/v1`, `/v2`), no calendar versioning is implemented. A breaking change (removed/renamed field, changed type, new required field, changed response structure) needs a major bump with a deprecation window on the old path; everything else (new endpoint, new optional field, new response field) ships freely within `/v1`. Full lifecycle: `internal-docs/api/versioning.md`.

Mark a deprecated route with `@Deprecated({ since, sunset, migrationUrl })` (`apps/api/src/common/decorators/deprecated.decorator.ts`), never set `Deprecation`/`Sunset`/`Link` headers by hand.

## Naming & verbs

- Nouns, plural, lowercase: `/v1/workspaces`, not `/v1/getWorkspaces`.
- Nest resources the way the data model nests them (messages under channels, agents under workspaces), no more than two levels deep.
- Non-CRUD operations are action subresources: `POST /v1/agent-runs/{id}/approve`.
- Handler method names must match the verb (enforced by `wire-api/controller-verb-naming` lint rule):

| Decorator   | Method name pattern                  |
| ----------- | ------------------------------------ |
| `@Get()`    | `list`, `get`, `getById`, `find...`  |
| `@Post()`   | `create`, `add`, `execute`, `run...` |
| `@Put()`    | `replace`, `set...`                  |
| `@Patch()`  | `update`, `patch...`                 |
| `@Delete()` | `remove`, `delete...`                |

Full detail: `internal-docs/api/naming-and-verbs.md`.

## Response envelope, never build this by hand

Every response is `{success, data, error, meta}` (`ApiResponse<T>` in `@wire/types`). **Controllers return plain data; never construct this shape yourself.** `ResponseEnvelopeInterceptor` wraps success responses, `ApiExceptionFilter` wraps errors, both are already registered globally in `apps/api/src/create-app.ts`.

For a paginated list, return `new PaginatedResult(items, buildPaginationMeta(page, perPage, total))` (`apps/api/src/common/dto/paginated-result.ts`, `.../pagination-meta.ts`) instead of a raw array, the interceptor reads it to populate `meta.pagination`.

204 is never used, deletions return 200 with `data: null`, so the envelope guarantee never breaks.

`wire-api/no-manual-envelope` lints for accidental hand-built envelopes (a classic double-wrapping bug). Full detail: `internal-docs/api/responses.md`.

## Permissions, every endpoint declares one

Every `@Get/@Post/@Put/@Patch/@Delete` handler must carry **either** `@RequirePermission(action, subject)` **or** `@Public()`, nothing else is acceptable, and `wire-api/require-permission` lints for it. `action` is `"manage" | "create" | "read" | "update" | "delete"`; `subject` is one of the resource names in `PermissionSubject` (`apps/api/src/permissions/permission.types.ts`).

```typescript
@Post()
@RequirePermission("create", "Message")
@ApiCreatedResponse({ type: MessageDto })
create(@Body() body: CreateMessageRequestDto): Message { ... }
```

Two roles compose from the same permission vocabulary via CASL's `AbilityBuilder` (`apps/api/src/permissions/ability.factory.ts`): `admin` gets `can("manage", "all")` (everything); `member` gets an explicit, curated subset per subject, there's no implicit grant, so a new subject with no `member` rule means members get nothing on it until you add one. Use `@Public()` only for routes that must work with no session at all (health checks), it is not a "low privilege" tier, it skips both `SessionGuard` and `PermissionsGuard` entirely.

Full detail, the complete admin/member permission matrix, and a known gap in role resolution for workspace-less routes: `internal-docs/api/permissions.md`.

## Errors, always use a stable code

`error.code` is one of `VALIDATION_ERROR | AUTHENTICATION_ERROR | PERMISSION_DENIED | RESOURCE_NOT_FOUND | RESOURCE_CONFLICT | RATE_LIMIT_EXCEEDED | INTERNAL_ERROR | SERVICE_UNAVAILABLE` (`ApiErrorCode` in `@wire/types`). Never invent a new one without updating that type.

- Prefer Nest's built-in exceptions (`NotFoundException`, `ForbiddenException`, ...) when the default HTTP-status → code mapping is already correct (`apps/api/src/common/errors/http-status-error-code.map.ts`).
- Use `ApiException` subclasses (`apps/api/src/common/errors/api-exception.ts`), e.g. `ValidationException`, `ResourceConflictException`, when you need an explicit code or field-level `details`.
- **Never** `throw new Error(...)` in `apps/api`, it always maps to a generic 500 `INTERNAL_ERROR`. `wire-api/no-bare-error-throw` lints for this.

### Never return raw error messages

`error.message` is written by us, for the API consumer. It must never contain text that came from somewhere else, a caught exception's `message`/`stack`, a Postgres or Redis error, a third-party API response body, a file path, SQL, or any internal identifier the caller couldn't already see.

- **Don't** pass a caught error through: `throw new BadRequestException(err.message)`, `new ApiException(code, \`failed: ${err}\`, ...)`, or `details: [{ message: e.message }]` are all violations.
- **Do** catch, log the raw error server-side (`this.logger.error(...)`, it's correlated by `X-Request-ID`), and throw an authored message: `throw new ResourceConflictException("An agent with handle @x already exists.")`.
- Map expected database errors to a specific exception at the source, e.g. `isUniqueViolation(err, "UQ_…")` → `ResourceConflictException`, and rethrow everything else unchanged so the filter turns it into a generic `INTERNAL_ERROR`.
- Every 5xx reaches the client as `"An unexpected error occurred."`, `ApiExceptionFilter` enforces this for anything that isn't an `ApiException` (including Nest/library `HttpException`s with a 5xx status). Don't try to be helpful in a 5xx message; the `request_id` in `meta` is what support uses to find the logged cause.
- The same applies to stored errors surfaced later (e.g. a webhook delivery's `last_error`): return a code or a summary we wrote, never the raw upstream text.

Full detail: `internal-docs/api/errors.md`.

## Observability, automatic, do not re-wire

HTTP access logs and OpenTelemetry are framework defaults (same idea as the response envelope and `X-Request-ID`). **A new endpoint needs zero observability code** to show up in turbo and in Grafana.

### What you get for free

- **Access log** (middleware, not an interceptor, so guard 401s still log): one turbo line per request, e.g. `GET /v1/workspaces 401 12ms req_…`. Level: `info` for 2xx/3xx, `warn` for 4xx, `error` for 5xx. `/health` is `debug` only.
- **Traces**: OTEL auto-instrumentation covers HTTP/Express/`pg`/`ioredis`/Nest. Spans export only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Service name defaults to `wire-api`.
- **Correlation**: `X-Request-ID` / `meta.request_id` is stamped on the active span; 5xx paths also mark the span as error in `ApiExceptionFilter`.

Wiring lives only in bootstrap: `apps/api/src/instrumentation.ts` (OTEL first import), `main.ts` (pino Nest logger), `AppModule` (`RequestLoggingMiddleware`), shared SDK in `@wire/observability`.

### What to do (and not do) in feature code

| Do                                                                                                  | Don't                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Nest `Logger` for rare domain `warn`/`error` (log the raw cause, throw an authored client message)  | `console.*` anywhere under `src/` (lint: `wire-api/no-console-logging`)                                                          |
| Catch → log → throw `ApiException` / Nest HTTP exception                                            | Per-route `@UseInterceptors` for logging/tracing, or starting an OTEL SDK in a module (lint: `wire-api/no-manual-observability`) |
| Custom spans only for work auto-instrumentation cannot see (use `trace` from `@wire/observability`) | Log successful CRUD at `info`, or hand-roll access logs                                                                          |

### Local Grafana (interpret traces)

Opt-in Docker profile. Config (datasources, dashboards, alert monitors) is versioned under `packages/observability/grafana/` (and Alloy/Tempo/Loki configs beside it), not a separate app.

```sh
make observability-up
# apps/api/.env → OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# restart the API, hit any route
# open http://localhost:3003 → Wire → Wire API overview
```

- Alloy listens on `:4318` (OTLP HTTP). Grafana is on `:3003` (docs already use `:3000`).
- Empty charts / "Recent API traces" almost always means the OTLP endpoint is unset or the API was not restarted after setting it. TraceQL metrics (rate, p99) need a few minutes of traffic after Tempo starts.
- Edit monitors/dashboards in `packages/observability/`. Dashboards reload from disk; Tempo/Alloy config changes need a container recreate. Do not treat the Grafana UI as source of truth.

Full detail: `internal-docs/api/observability.md`, package README under `packages/observability/`.

## Headers

- `X-Request-ID` (both directions, client-settable, server-minted if absent) and `X-API-Version` (response) are set automatically, don't touch these yourself.
- `Idempotency-Key` on mutating endpoints that need duplicate-execution protection: add `@UseInterceptors(IdempotencyInterceptor)` on the specific route (not global, see `apps/api/src/workspaces/workspaces.controller.ts`'s `create()` for the reference).
- Rate-limit headers (`RateLimit-Limit/Remaining/Reset`, `Retry-After` on 429) are set globally by `RateLimitMiddleware`, nothing to add per-endpoint.
- Deprecation headers come from the `@Deprecated()` decorator above.

Full detail: `internal-docs/api/headers.md`.

## Pagination, filtering, sorting

Collection endpoints take `@Query() query: PaginationQueryDto` (`page`, `per_page`, `sort`, `search`, all optional, typed and validated). Dynamic `filter[field]=value` params aren't bindable by a fixed DTO; read them with `parseFilterQuery(req.query)`. Full detail: `internal-docs/api/pagination.md`.

## Numeric data, number vs. string

Default to a JSON number. Use a string only when the value needs exact representation or isn't genuinely numeric:

| Data                                                                             | Type                                                                          |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Integers, ordinary decimals, percentages, ratios, measurements, ratings, lat/lng | **Number**                                                                    |
| Integers outside ±(2⁵³ − 1) (the JS/IEEE 754 safe-integer limit)                 | **String**                                                                    |
| High-precision decimals needing exact preservation                               | **String**                                                                    |
| Financial amounts                                                                | **String**, or an integer minor-units field (`amount_minor: 1999` for £19.99) |
| IDs, reference numbers, phone numbers, postcodes                                 | **String**, always, even if all-digit                                         |

Never stringify an ordinary number to dodge floating-point worries, that's not what the string exception is for. Never let a field's type vary between number and string depending on its value. Full detail: `internal-docs/api/numeric-data.md`.

All `@wire/types` resource IDs are already string-literal template types (`` `ws_${string}` ``, etc.), a new resource must follow the same pattern, never a numeric ID. `wire-api/no-numeric-id` lints for an ID-shaped DTO property (`id`, `*Id`, `*_id`) typed `number` or decorated `@ApiProperty({ type: Number })` / `@IsNumber()`.

## DTO examples, every field must show a real shape

A bare `@ApiProperty()` (or one with only `description`/`nullable`/`required`) renders in the generated spec as an untyped placeholder, a consumer generating a client or reading the spec has nothing to go on. Every `@ApiProperty`/`@ApiPropertyOptional` must carry at least one of:

- **`example`**, a concrete, realistic value. This covers almost everything: `@ApiProperty({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })` for an ID (match the resource's actual prefix), `@ApiProperty({ example: "2026-01-15T09:30:00.000Z" })` for a timestamp, `@ApiProperty({ nullable: true, type: String, example: "Q4 planning" })` for a nullable field (example the _populated_ case, not `null`).
- **`enum`**, for a closed set of string literals: `@ApiProperty({ enum: ["human", "agent", "system"] })`. Satisfies the rule on its own; don't bolt on a redundant `example` unless it adds information `enum` doesn't already give.
- **`oneOf`** with `$ref`s, for a discriminated union (zod `discriminatedUnion` or a TS union of object shapes): define one Swagger class per variant, register them with `@ApiExtraModels(...)` on the containing DTO, and reference them via `getSchemaPath()`. See `UiConfigDto`/`ThemeDto` in `apps/api/src/ui-config/dto/ui-config.dto.ts` for the reference shape (font source / icon pack variants).
- **A concrete `type`**, a nested DTO class (`type: () => FooDto` or `type: [FooDto]`), or `type: "object"` paired with `additionalProperties` for a `Record<string, X>` dictionary field, with a representative `example`: `@ApiProperty({ type: "object", additionalProperties: { type: "integer" }, example: { "👍": 3 } })` (the `reactionCounts` pattern, `message.dto.ts`). A bare `type: String`/`Number`/`Boolean` does **not** satisfy this, it only restates what TypeScript already infers from the property, and gives a spec consumer no more than they already had.

For a deeply nested domain type that already has its own validated schema elsewhere (e.g. a zod schema in a `packages/*` package), don't duplicate every nested field's validator, model the shape as a parallel tree of Swagger-only DTO classes (one per nested object/union) purely for documentation, the way `UiConfigResourceDto` → `UiConfigDto` → `ThemeDto` → `ColorRolesDto` does, with the real validation still happening server-side against the canonical schema.

Enforced by `wire-api/require-api-property-example` on every `src/**/dto/*.dto.ts` file, see Lint enforcement below.

`description` strings on any Swagger decorator (`@ApiProperty`, `@ApiOkResponse`, `@ApiHeader`, `@ApiQuery`, ...), and the OpenAPI document's own top-level description (`export-openapi.ts`'s `setDescription(...)`), must use plain ASCII punctuation, not an em dash (, ): it renders inconsistently across the doc-viewing/SDK-generation tools downstream of the generated spec. Use a comma, colon, or hyphen instead. Enforced by `wire-api/no-em-dash-in-api-description` on controllers, DTOs, and `export-openapi.ts`.

## SDK-facing client code

`apps/web/src/lib/api-client.ts`'s `apiFetch<T>()` is the reference "one generic handler" pattern, copy it, don't reinvent response-unwrapping logic per call site. Full detail: `internal-docs/api/sdk-architecture.md`.

## Lint enforcement

`@wire/eslint-plugin-wire-api` (`packages/eslint-plugin-wire-api/`) enforces several of the above automatically on every `apps/api` file: `require-api-response` (every HTTP-decorated handler needs an `@Api*Response` decorator, this is what makes the generated spec complete), `require-permission` (every HTTP-decorated handler needs `@RequirePermission` or `@Public()`), `controller-verb-naming`, `no-bare-error-throw`, `no-manual-envelope`, `no-numeric-id`, `require-api-property-example` (every `@ApiProperty`/`@ApiPropertyOptional` in `src/**/dto/*.dto.ts` needs an `example`, `enum`, `oneOf`, or concrete `type`, see "DTO examples" above), `no-em-dash-in-api-description` (no em dash in any OpenAPI-facing `description` string), `no-console-logging` (use Nest Logger / `@wire/observability`, request logs are automatic), and `no-manual-observability` (no per-route logging/tracing interceptors or DIY OTEL SDK). Run `bun run lint` before considering an endpoint done.

This custom plugin exists specifically because **[Ultracite](https://www.ultracite.ai)/Biome** (the fast first-pass linter+formatter, config at root `biome.jsonc`) can't load custom plugins, it covers generic correctness/style rules only. ESLint + `@wire/eslint-plugin-wire-api` (via `bun run lint:wire-rules`) is where anything Wire-specific lives. `bun run lint` runs both (Biome first, since it's near-instant, then the wire-rules ESLint pass).
