# Wire

Wire is an **API-first**, **AI-native** team messaging platform. Humans, software services, and **agents** collaborate in shared workspaces through channels, threads, and structured artifacts. The contract for the system is the [OpenAPI specification](./internal-docs/api/openapi.yaml) — **generated** from the running API's `@nestjs/swagger` decorators, never hand-edited; clients, MCP servers, and agent harnesses are peers that consume the same surface.

## Principles

| Principle | Meaning |
|-----------|---------|
| API-first | Every capability exists in the HTTP API before any UI. |
| Agents as actors | Agents have identity, permissions, presence, and audit trails like human members. |
| Harness-neutral | Claude, Cursor, custom SDKs, and cron workers integrate via OAuth, API keys, MCP, and webhooks. |
| Import-first onboarding | **Slack admin export** is the primary way to capture users and backdated history. |
| Retrieval-native | Messages and files are indexed for semantic search, citation, and agent context assembly. |
| Automations as code | Triggers, filters, and actions are declarative and versioned; agents can author and run them. |
| MCP as distribution | A standard MCP server exposes Wire tools to any MCP-capable host. |

## Local development

Requires [Bun](https://bun.sh) and Docker (for Postgres only).

```bash
make setup   # once: bun install + .env files from .env.example
make dev     # Postgres in Docker, migrations, then api + web + docs via Turborepo
```

Apps run natively with Bun and hot reload: web on http://localhost:5173, API on http://localhost:3001 (OpenAPI UI at `/docs`), markdown docs on http://localhost:3000. `make help` lists everything; `make docker-up` runs the whole stack in containers instead. Checks (`bun run typecheck`, `bun run lint`, `bun run test`) run through Turborepo and are cached.

## Repository map

| Folder | Contents |
|--------|----------|
| [product/](./internal-docs/product/) | Vision, core concepts, agents, feature parity, roadmap |
| [ui/](./internal-docs/ui/) | Config-driven client UI — stack, `UiConfig` schema, theming/layout, admin policy |
| [api/](./internal-docs/api/) | **Canonical API contract** (`openapi.yaml`), auth/tenancy, events/webhooks, versioning |
| [retrieval/](./internal-docs/retrieval/) | Search, embeddings, context packs |
| [harnesses/](./internal-docs/harnesses/) | Model/provider binding — Claude, OpenAI, Cursor, custom runners |
| [automations/](./internal-docs/automations/) | Rules, workflows, scheduling, examples |
| [mcp/](./internal-docs/mcp/) | MCP server design, tools, resources |
| [import/](./internal-docs/import/) | Slack export mapping and claim flow |
| [data-model/](./internal-docs/data-model/) | Entities and relationships |
| [sdks/](./internal-docs/sdks/) | Client generation and SDK distribution |
| [stack/](./internal-docs/stack/) | Engineering stack, monorepo layout, self-hosted infra (Pulumi) |
| [gtm/](./internal-docs/gtm/) | Go-to-market strategy, ICP, distribution channels |
| [pricing/](./internal-docs/pricing/) | Packaging, metering, billing |
| [security-compliance/](./internal-docs/security-compliance/) | Threat model, data residency, compliance roadmap |

## Documentation map

| Path | Contents |
|------|----------|
| [product/01-vision.md](./internal-docs/product/01-vision.md) | Product vision and non-goals |
| [product/02-core-concepts.md](./internal-docs/product/02-core-concepts.md) | Workspaces, channels, messages, threads |
| [product/03-agents.md](./internal-docs/product/03-agents.md) | Agent lifecycle, identity, delegation |
| [ui/README.md](./internal-docs/ui/README.md) | **Config-driven UI**: why, the base→org→user resolution model |
| [ui/config-schema.md](./internal-docs/ui/config-schema.md) | `UiConfig` shape, versioning, extensibility (`@wire/ui-config`) |
| [ui/theming-and-layout.md](./internal-docs/ui/theming-and-layout.md) | Slots, layouts, how config becomes pixels |
| [ui/admin-policy.md](./internal-docs/ui/admin-policy.md) | Locks, enforcement, RBAC for org-level config |
| [automations/automations.md](./internal-docs/automations/automations.md) | Rules, workflows, scheduling |
| [retrieval/retrieval.md](./internal-docs/retrieval/retrieval.md) | Search, embeddings, context packs |
| [mcp/mcp.md](./internal-docs/mcp/mcp.md) | MCP server design |
| [harnesses/harnesses.md](./internal-docs/harnesses/harnesses.md) | Claude, OpenAI, Cursor, custom runners |
| [api/events-webhooks.md](./internal-docs/api/events-webhooks.md) | Realtime and async integration |
| [api/auth-tenancy.md](./internal-docs/api/auth-tenancy.md) | Auth, RBAC, org boundaries |
| [api/versioning.md](./internal-docs/api/versioning.md) | **API lifecycle**: major versions, experimental/beta, deprecation windows |
| [api/naming-and-verbs.md](./internal-docs/api/naming-and-verbs.md) | Resource naming, HTTP verb conventions |
| [api/responses.md](./internal-docs/api/responses.md) | **Universal response envelope** |
| [api/errors.md](./internal-docs/api/errors.md) | Stable machine-readable error codes |
| [api/headers.md](./internal-docs/api/headers.md) | Request/response headers, rate limiting, deprecation signals |
| [api/pagination.md](./internal-docs/api/pagination.md) | Shared pagination, filtering, sorting contract |
| [api/numeric-data.md](./internal-docs/api/numeric-data.md) | Number vs. string conventions, safe integers, money fields |
| [api/permissions.md](./internal-docs/api/permissions.md) | **RBAC**: CASL permission model, admin/member roles, `@RequirePermission` |
| [api/sdk-architecture.md](./internal-docs/api/sdk-architecture.md) | Why one generic handler is enough for every endpoint |
| [data-model/data-model.md](./internal-docs/data-model/data-model.md) | Entities and relationships |
| [product/04-implementation-roadmap.md](./internal-docs/product/04-implementation-roadmap.md) | Suggested build phases |
| [product/05-feature-parity.md](./internal-docs/product/05-feature-parity.md) | **Mainstream chat feature parity** (channels, threads, etc.) |
| [import/workspace-import.md](./internal-docs/import/workspace-import.md) | **Slack export import** (primary user capture, backdating) |
| [import/](./internal-docs/import/) | Export zip mapping and claim flow |
| [automations/](./internal-docs/automations/) | Automation examples and action keys |
| [api/README.md](./internal-docs/api/README.md) | Using the HTTP API |
| [api/openapi.yaml](./internal-docs/api/openapi.yaml) | **Canonical API contract** — generated, regenerate with `bun run openapi:export` in `apps/api` |
| [mcp/README.md](./internal-docs/mcp/README.md) | MCP packaging and deployment |
| [sdks/](./internal-docs/sdks/) | Generated client libraries and release process |
| [stack/](./internal-docs/stack/) | TypeScript monorepo, Pulumi IaC, self-hosted services |
| [gtm/](./internal-docs/gtm/) | GTM strategy, ICP/wedge, distribution channels, competitive landscape |
| [pricing/](./internal-docs/pricing/) | Packaging tiers, metering, billing resource model |
| [security-compliance/](./internal-docs/security-compliance/) | Threat model, data residency, compliance roadmap |

## Quick integration paths

0. **Onboard from Slack** — Upload admin export zip → `POST /workspaces/from-import` → users claim accounts → agents/search see backdated history ([import/workspace-import.md](./internal-docs/import/workspace-import.md)).
1. **REST + webhooks** — Provision an app, subscribe to events, post messages and run agent turns via `/v1`.
2. **MCP** — Point a host at `wire-mcp`; authenticate with workspace-scoped tokens; call tools (`search`, `post_message`, `run_agent`, etc.).
3. **Agent harness** — Register an `Agent` resource, attach a `Harness` (model + tools + system prompt template), invoke `POST /v1/agent-runs`.

## Status

`internal-docs/` holds the design specifications; `apps/` and `packages/` hold a working implementation of a subset of that spec: health, workspaces, members, channels, messages, threads, reactions, pins, agents, files, search (keyword only), webhook-endpoints, audit-events, ui-config — every endpoint is RBAC-gated via CASL (`admin`/`member` roles, see [api/permissions.md](./internal-docs/api/permissions.md)). Only `workspaces` is backed by Postgres (via TypeORM) — every other resource is an in-memory mock service, not persisted across restarts, and role resolution only works correctly on routes with a `:workspaceId` param (see the known gap in api/permissions.md). `apps/web` has a Tailwind + shadcn-conventioned shell driven entirely by the resolved `UiConfig` (see [ui/](./internal-docs/ui/)) — nav rail, channel list, topbar, and composer slots only; no message history, no settings UI yet. See [product/04-implementation-roadmap.md](./internal-docs/product/04-implementation-roadmap.md) for what's not built yet: agent runs/harnesses, automations, the retrieval/semantic-search pipeline, SSE/realtime event delivery, Slack import, and the MCP server. Version `0.1.0` of the API matches the OpenAPI `info.version` field.
