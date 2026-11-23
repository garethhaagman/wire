# TypeScript monorepo layout

## Tooling

- **Runtime / package manager / workspaces**: Bun (`bun.lock`, `workspaces` in the root `package.json`). Apps run TypeScript directly — `apps/api` has no build step.
- **Build orchestration**: Turborepo (task graph, local cache only — no vendor remote cache, keeping "no managed services" true).
- **TypeScript**: `strict: true` plus `exactOptionalPropertyTypes`, shared via `tsconfig.base.json`; each package runs `tsc --noEmit`.
- **Lint/format**: oxlint at the root, then ESLint per package (`@wire/eslint-config` plus the repo's own rule plugins `@wire/eslint-plugin-wire-api` and `@wire/eslint-plugin-wire-ui`), Prettier for formatting, knip for unused files/exports.
- **Testing**: `bun test` (currently only `packages/ui-config`). A contract suite that replays `openapi.yaml` against the running `api` is still planned (ties into [sdks/](../sdks/) drift checks).

## Directory structure

```text
wire/
├── apps/
│   ├── api/                     # NestJS HTTP + SSE service; also runs background workers (RUN_WORKERS)
│   ├── web/                     # Vite + React client shell, driven by UiConfig
│   └── docs/                    # Markdown viewer for internal-docs/
├── packages/
│   ├── types/                   # @wire/types — API resource/event types, zero runtime deps
│   ├── db/                      # @wire/db — Database (pg pools), typed query functions, migrations
│   ├── config/                  # @wire/config — env var parsing/validation (zod), shared across apps
│   ├── ui-config/               # @wire/ui-config — UI config schema, resolver, theme projection
│   ├── eslint-config/           # shared ESLint config
│   ├── eslint-plugin-wire-api/  # API rules (require-permission, no-bare-error-throw, no-numeric-id, …)
│   └── eslint-plugin-wire-ui/   # UI rules (no-hardcoded-colors, …)
├── infra/                       # Pulumi TypeScript program — see infra-pulumi.md
├── internal-docs/               # this spec
├── docker-compose.yml           # Postgres + Redis for local dev; full stack under the `docker` profile
├── Makefile                     # `make dev`, `make migrate`, …
├── turbo.json
└── tsconfig.base.json
```

Planned but not yet created: `apps/worker` (agent runs, automations, import, indexing — today the only background jobs are the outbox relay and webhook delivery, which run inside `apps/api`), `apps/mcp-server`, and `packages/harness` (provider adapters; see "Agent/harness isolation" below).

## Types and the OpenAPI contract

The contract is **code-first**: `internal-docs/api/openapi.yaml` is generated from the API's `@nestjs/swagger` decorators (`bun run openapi:export` in `apps/api`) and never hand-edited. `@wire/types` is hand-written TypeScript that the API's DTOs implement and that `apps/web` imports, so a shape change is a type error on both sides. Published SDKs and MCP tool schemas are generated from the exported spec, which is where CI drift checks belong.

## Database access: no ORM in the request path

`@wire/db` exposes a `Database` class (primary pool, optional read replica via `reader`, `tx()` helper that retries serialization failures and deadlocks) and hand-written, typed query functions per aggregate under `packages/db/src/repositories/` (`messages.ts`, `channels.ts`, …). Postgres also does full-text search and will do vector search (per [architecture.md](./architecture.md)), and an ORM's query builder fights exactly those queries — plus the row locks, `SKIP LOCKED` and keyset pagination the write path relies on.

TypeORM is used **only** as the migration runner: migrations are TypeScript classes containing raw SQL in `packages/db/src/migrations/`, applied with `make migrate`, which then applies Better Auth's schema from plain SQL (`packages/db/migrations/0002_create_auth_tables.sql`). Scale-relevant schema decisions are in [data-model/scaling.md](../data-model/scaling.md).

## Internal package versioning

Internal `@wire/*` packages are version-locked to the monorepo (`workspace:*` protocol) — they do not get independent semver inside the monorepo. The only externally-semver'd artifacts are the published SDKs (`sdks/`) and the OpenAPI `info.version` itself. This avoids the common monorepo trap of needing a release train for packages nobody outside the repo consumes.

## Agent/harness isolation

When `@wire/harness` is built, it should have no dependency on `@wire/db` or `apps/api` internals — only provider wire formats (Anthropic Messages API, OpenAI Responses API, custom HTTP envelope per [harnesses/harnesses.md](../harnesses/harnesses.md)). This keeps vendor SDK churn out of the request path and lets harness adapters be unit-tested against fixture payloads with no running services.
