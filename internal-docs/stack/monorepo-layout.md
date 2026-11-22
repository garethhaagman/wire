# TypeScript monorepo layout

## Tooling

- **Package manager / workspaces**: pnpm workspaces (strict node_modules, fast, no phantom deps).
- **Build orchestration**: Turborepo (task graph, remote-cache-free by default to keep "no managed services" true — cache locally/on self-hosted CI runners, not a vendor remote cache).
- **TypeScript**: `strict: true`, project references across packages so `tsc -b` gives real incremental builds and cross-package type-checking.
- **Lint/format**: ESLint + Prettier, single root config, no per-package overrides without a documented reason.
- **Testing**: Vitest for unit/integration; a separate `tests/contract` suite replays the OpenAPI spec against the running `api` service (ties into [sdks/](../sdks/) drift checks).

## Directory structure

```text
wire/
├── apps/
│   ├── api/                 # HTTP + WS/SSE service
│   ├── worker/               # agent runs, automations, import, indexing
│   └── mcp-server/           # MCP adapter
├── packages/
│   ├── types/                 # @wire/types — generated from api/openapi.yaml, zero runtime deps
│   ├── sdk-core/               # @wire/sdk-core — typed fetch client shared by generated SDKs and internal services
│   ├── db/                     # @wire/db — Postgres schema, migrations, query layer (no ORM magic — see below)
│   ├── domain/                 # @wire/domain — pure business logic: permission checks, mention resolution, condition DSL eval
│   ├── harness/                 # @wire/harness — provider adapters (anthropic | openai | custom_http), isolated from apps/worker
│   ├── events/                  # @wire/events — event envelope types, outbox helpers
│   └── config/                  # @wire/config — env var parsing/validation (zod schemas), shared across apps
├── infra/                       # Pulumi TypeScript program — see infra-pulumi.md
├── docs/ … product/ … etc.      # this spec (unchanged by the stack choice)
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Why `packages/types` is load-bearing

`api/openapi.yaml` is the canonical contract (per root README). `packages/types` is generated from it (e.g. `openapi-typescript`) as a build step, not hand-maintained. Everything downstream — `apps/api` route handlers, `apps/worker` job payloads, `apps/mcp-server` tool schemas, and every published SDK in [sdks/](../sdks/) — imports from `@wire/types`. This is what makes "MCP tool schemas generated from OpenAPI, CI diff fails on drift" (per `mcp/README.md`) actually enforceable: drift becomes a type error, not a review-time judgment call.

## Database access: no ORM

`@wire/db` wraps `postgres.js` or `pg` with hand-written, typed query functions per aggregate (`messages.ts`, `agentRuns.ts`, …) rather than an ORM. Given Postgres is also doing vector search and FTS (per [architecture.md](./architecture.md)), an ORM's query builder fights the exact queries that matter most (hybrid rank fusion, `tsvector` + `pgvector` combined scoring). Migrations are plain SQL, applied via a minimal runner (e.g. `node-pg-migrate` or `graphile-migrate`), checked into `packages/db/migrations/`.

## Internal package versioning

Internal `@wire/*` packages are version-locked to the monorepo (`workspace:*` protocol) — they do not get independent semver inside the monorepo. The only externally-semver'd artifacts are the published SDKs (`sdks/`) and the OpenAPI `info.version` itself. This avoids the common monorepo trap of needing a release train for packages nobody outside the repo consumes.

## Agent/harness isolation

`@wire/harness` has no dependency on `@wire/db` or `apps/api` internals — it only knows provider wire formats (Anthropic Messages API, OpenAI Responses API, custom HTTP envelope per [harnesses/harnesses.md](../harnesses/harnesses.md)). This keeps vendor SDK churn from leaking into the request path, and makes it possible to unit-test harness adapters against fixture payloads with no running services.
