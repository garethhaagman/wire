---
name: api-design
description: Use when adding, changing, or reviewing any endpoint in apps/api — a new resource controller, a new DTO, a new error case, or anything touching the HTTP surface. Also use when asked about Wire's API conventions, response envelope, error codes, pagination, headers, or OpenAPI spec generation.
version: "1.3.0"
---

# Wire API design

Every endpoint in `apps/api` follows one set of conventions so an SDK only ever needs one generic HTTP handler. The full reasoning lives in `internal-docs/api/` — this skill is the condensed, actionable version for building a new endpoint correctly on the first pass.

**The OpenAPI spec (`internal-docs/api/openapi.yaml`) is generated, never hand-edited.** It's produced by `apps/api/scripts/export-openapi.ts` from `@nestjs/swagger` decorators on the real controllers. After adding or changing a controller/DTO, regenerate it:

```sh
cd apps/api && DATABASE_URL=... bun run openapi:export
```

## Adding a new resource — checklist

Use `internal-docs/api/workspaces` (well, `apps/api/src/workspaces/`) as the reference shape. For a resource `Foo`:

1. **Types** (`packages/types/src/foo.ts`): `Foo` interface with a prefixed string-literal `id` (`` `foo_${string}` ``), `CreateFooRequest`. Export from `packages/types/src/index.ts`.
2. **DTOs** (`apps/api/src/foo/dto/foo.dto.ts`): a Swagger-only class per type implementing the `@wire/types` interface, decorated with `@ApiProperty()`. The request DTO gets `class-validator` decorators (`@IsString()`, `@Length()`, etc.) — this is what actually validates incoming requests via the global `ValidationPipe`.
3. **Service** (`apps/api/src/foo/foo.service.ts`): business logic. Throw `NotFoundException` (or other Nest built-ins) for the common cases; throw `ApiException` subclasses only when the default status→code mapping isn't precise enough (see Errors below).
4. **Controller** (`apps/api/src/foo/foo.controller.ts`): see Naming & verbs below for method names, URL shape, and the required decorators.
5. **Permissions**: add `"Foo"` to `PermissionSubject` in `apps/api/src/permissions/permission.types.ts`, decide which actions `member` gets in `ability.factory.ts` (admin always gets everything via `manage all`), then put `@RequirePermission(action, "Foo")` on every handler — see Permissions below.
6. **Module**: wire controller + service, import into `AppModule`.
7. **Regenerate the OpenAPI spec** and commit the diff alongside the code change.

## Versioning

URL-based major versions only (`/v1`, `/v2`) — no calendar versioning is implemented. A breaking change (removed/renamed field, changed type, new required field, changed response structure) needs a major bump with a deprecation window on the old path; everything else (new endpoint, new optional field, new response field) ships freely within `/v1`. Full lifecycle: `internal-docs/api/versioning.md`.

Mark a deprecated route with `@Deprecated({ since, sunset, migrationUrl })` (`apps/api/src/common/decorators/deprecated.decorator.ts`) — never set `Deprecation`/`Sunset`/`Link` headers by hand.

## Naming & verbs

- Nouns, plural, lowercase: `/v1/workspaces`, not `/v1/getWorkspaces`.
- Nest resources the way the data model nests them (messages under channels, agents under workspaces) — no more than two levels deep.
- Non-CRUD operations are action subresources: `POST /v1/agent-runs/{id}/approve`.
- Handler method names must match the verb (enforced by `wire-api/controller-verb-naming` lint rule):

| Decorator | Method name pattern |
|-----------|----------------------|
| `@Get()` | `list`, `get`, `getById`, `find...` |
| `@Post()` | `create`, `add`, `execute`, `run...` |
| `@Put()` | `replace`, `set...` |
| `@Patch()` | `update`, `patch...` |
| `@Delete()` | `remove`, `delete...` |

Full detail: `internal-docs/api/naming-and-verbs.md`.

## Response envelope — never build this by hand

Every response is `{success, data, error, meta}` (`ApiResponse<T>` in `@wire/types`). **Controllers return plain data; never construct this shape yourself.** `ResponseEnvelopeInterceptor` wraps success responses, `ApiExceptionFilter` wraps errors — both are already registered globally in `apps/api/src/create-app.ts`.

For a paginated list, return `new PaginatedResult(items, buildPaginationMeta(page, perPage, total))` (`apps/api/src/common/dto/paginated-result.ts`, `.../pagination-meta.ts`) instead of a raw array — the interceptor reads it to populate `meta.pagination`.

204 is never used — deletions return 200 with `data: null`, so the envelope guarantee never breaks.

`wire-api/no-manual-envelope` lints for accidental hand-built envelopes (a classic double-wrapping bug). Full detail: `internal-docs/api/responses.md`.

## Permissions — every endpoint declares one

Every `@Get/@Post/@Put/@Patch/@Delete` handler must carry **either** `@RequirePermission(action, subject)` **or** `@Public()` — nothing else is acceptable, and `wire-api/require-permission` lints for it. `action` is `"manage" | "create" | "read" | "update" | "delete"`; `subject` is one of the resource names in `PermissionSubject` (`apps/api/src/permissions/permission.types.ts`).

```typescript
@Post()
@RequirePermission("create", "Message")
@ApiCreatedResponse({ type: MessageDto })
create(@Body() body: CreateMessageRequestDto): Message { ... }
```

Two roles compose from the same permission vocabulary via CASL's `AbilityBuilder` (`apps/api/src/permissions/ability.factory.ts`): `admin` gets `can("manage", "all")` (everything); `member` gets an explicit, curated subset per subject — there's no implicit grant, so a new subject with no `member` rule means members get nothing on it until you add one. Use `@Public()` only for routes that must work with no session at all (health checks) — it is not a "low privilege" tier, it skips both `SessionGuard` and `PermissionsGuard` entirely.

Full detail, the complete admin/member permission matrix, and a known gap in role resolution for workspace-less routes: `internal-docs/api/permissions.md`.

## Errors — always use a stable code

`error.code` is one of `VALIDATION_ERROR | AUTHENTICATION_ERROR | PERMISSION_DENIED | RESOURCE_NOT_FOUND | RESOURCE_CONFLICT | RATE_LIMIT_EXCEEDED | INTERNAL_ERROR | SERVICE_UNAVAILABLE` (`ApiErrorCode` in `@wire/types`). Never invent a new one without updating that type.

- Prefer Nest's built-in exceptions (`NotFoundException`, `ForbiddenException`, ...) when the default HTTP-status → code mapping is already correct (`apps/api/src/common/errors/http-status-error-code.map.ts`).
- Use `ApiException` subclasses (`apps/api/src/common/errors/api-exception.ts`) — e.g. `ValidationException`, `ResourceConflictException` — when you need an explicit code or field-level `details`.
- **Never** `throw new Error(...)` in `apps/api` — it always maps to a generic 500 `INTERNAL_ERROR`. `wire-api/no-bare-error-throw` lints for this.

### Never return raw error messages

`error.message` is written by us, for the API consumer. It must never contain text that came from somewhere else — a caught exception's `message`/`stack`, a Postgres or Redis error, a third-party API response body, a file path, SQL, or any internal identifier the caller couldn't already see.

- **Don't** pass a caught error through: `throw new BadRequestException(err.message)`, `new ApiException(code, \`failed: ${err}\`, ...)`, or `details: [{ message: e.message }]` are all violations.
- **Do** catch, log the raw error server-side (`this.logger.error(...)` — it's correlated by `X-Request-ID`), and throw an authored message: `throw new ResourceConflictException("An agent with handle @x already exists.")`.
- Map expected database errors to a specific exception at the source — e.g. `isUniqueViolation(err, "UQ_…")` → `ResourceConflictException` — and rethrow everything else unchanged so the filter turns it into a generic `INTERNAL_ERROR`.
- Every 5xx reaches the client as `"An unexpected error occurred."` — `ApiExceptionFilter` enforces this for anything that isn't an `ApiException` (including Nest/library `HttpException`s with a 5xx status). Don't try to be helpful in a 5xx message; the `request_id` in `meta` is what support uses to find the logged cause.
- The same applies to stored errors surfaced later (e.g. a webhook delivery's `last_error`): return a code or a summary we wrote, never the raw upstream text.

Full detail: `internal-docs/api/errors.md`.

## Headers

- `X-Request-ID` (both directions, client-settable, server-minted if absent) and `X-API-Version` (response) are set automatically — don't touch these yourself.
- `Idempotency-Key` on mutating endpoints that need duplicate-execution protection: add `@UseInterceptors(IdempotencyInterceptor)` on the specific route (not global — see `apps/api/src/workspaces/workspaces.controller.ts`'s `create()` for the reference).
- Rate-limit headers (`RateLimit-Limit/Remaining/Reset`, `Retry-After` on 429) are set globally by `RateLimitMiddleware` — nothing to add per-endpoint.
- Deprecation headers come from the `@Deprecated()` decorator above.

Full detail: `internal-docs/api/headers.md`.

## Pagination, filtering, sorting

Collection endpoints take `@Query() query: PaginationQueryDto` (`page`, `per_page`, `sort`, `search` — all optional, typed and validated). Dynamic `filter[field]=value` params aren't bindable by a fixed DTO; read them with `parseFilterQuery(req.query)`. Full detail: `internal-docs/api/pagination.md`.

## Numeric data — number vs. string

Default to a JSON number. Use a string only when the value needs exact representation or isn't genuinely numeric:

| Data | Type |
|------|------|
| Integers, ordinary decimals, percentages, ratios, measurements, ratings, lat/lng | **Number** |
| Integers outside ±(2⁵³ − 1) (the JS/IEEE 754 safe-integer limit) | **String** |
| High-precision decimals needing exact preservation | **String** |
| Financial amounts | **String**, or an integer minor-units field (`amount_minor: 1999` for £19.99) |
| IDs, reference numbers, phone numbers, postcodes | **String** — always, even if all-digit |

Never stringify an ordinary number to dodge floating-point worries — that's not what the string exception is for. Never let a field's type vary between number and string depending on its value. Full detail: `internal-docs/api/numeric-data.md`.

All `@wire/types` resource IDs are already string-literal template types (`` `ws_${string}` ``, etc.) — a new resource must follow the same pattern, never a numeric ID. `wire-api/no-numeric-id` lints for an ID-shaped DTO property (`id`, `*Id`, `*_id`) typed `number` or decorated `@ApiProperty({ type: Number })` / `@IsNumber()`.

## SDK-facing client code

`apps/web/src/lib/api-client.ts`'s `apiFetch<T>()` is the reference "one generic handler" pattern — copy it, don't reinvent response-unwrapping logic per call site. Full detail: `internal-docs/api/sdk-architecture.md`.

## Lint enforcement

`@wire/eslint-plugin-wire-api` (`packages/eslint-plugin-wire-api/`) enforces several of the above automatically on every `apps/api` file: `require-api-response` (every HTTP-decorated handler needs an `@Api*Response` decorator — this is what makes the generated spec complete), `require-permission` (every HTTP-decorated handler needs `@RequirePermission` or `@Public()`), `controller-verb-naming`, `no-bare-error-throw`, `no-manual-envelope`, `no-numeric-id`. Run `bun run lint` before considering an endpoint done.

This custom plugin exists specifically because **oxlint** (the fast first-pass linter, config at root `.oxlintrc.json`) can't load custom plugins or do type-aware checks — it covers generic correctness/style rules only. ESLint + `@wire/eslint-plugin-wire-api` is where anything Wire-specific or type-aware lives. `bun run lint` runs both (oxlint first, since it's near-instant, then ESLint).
