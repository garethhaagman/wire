# Wire

Wire is an **API-first**, **AI-native** team messaging platform. Humans, software services, and **agents** collaborate in shared workspaces through channels, threads, and structured artifacts. The contract for the system is the [OpenAPI specification](./internal-docs/api/openapi.yaml) — **generated** from the running API's `@nestjs/swagger` decorators, never hand-edited; clients, MCP servers, and agent harnesses are peers that consume the same surface.

## Principles

| Principle               | Meaning                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| API-first               | Every capability exists in the HTTP API before any UI.                                          |
| Agents as actors        | Agents have identity, permissions, presence, and audit trails like human members.               |
| Harness-neutral         | Claude, Cursor, custom SDKs, and cron workers integrate via OAuth, API keys, MCP, and webhooks. |
| Import-first onboarding | **Slack admin export** is the primary way to capture users and backdated history.               |
| Retrieval-native        | Messages and files are indexed for semantic search, citation, and agent context assembly.       |
| Automations as code     | Triggers, filters, and actions are declarative and versioned; agents can author and run them.   |
| MCP as distribution     | A standard MCP server exposes Wire tools to any MCP-capable host.                               |

## Local development

Requires [Bun](https://bun.sh) and Docker (for Postgres and Redis only).

```bash
make setup   # once: bun install + .env files from .env.example
make dev     # Postgres + Redis in Docker, migrations, seed, then api + web + docs via Turborepo
```

Apps run natively with Bun and hot reload: web on http://localhost:5173, API on http://localhost:3001 (OpenAPI UI at `/docs`), markdown docs on http://localhost:3000. `make help` lists everything; `make docker-up` runs the whole stack in containers instead. Checks (`bun run typecheck`, `bun run lint`, `bun run test`) run through Turborepo and are cached.

## Quick integration paths

0. **Onboard from Slack** — Upload admin export zip → `POST /workspaces/from-import` → users claim accounts → agents/search see backdated history ([import/workspace-import.md](./internal-docs/import/workspace-import.md)).
1. **REST + webhooks** — Provision an app, subscribe to events, post messages and run agent turns via `/v1`.
2. **MCP** — Point a host at `wire-mcp`; authenticate with workspace-scoped tokens; call tools (`search`, `post_message`, `run_agent`, etc.).
3. **Agent harness** — Register an `Agent` resource, attach a `Harness` (model + tools + system prompt template), invoke `POST /v1/agent-runs`.

## Status

`internal-docs/` holds the design specifications; `apps/` and `packages/` hold a working implementation of a subset of that spec: health, workspaces, members, channels (incl. DMs, membership, unread state), messages, threads, reactions, pins, bookmarks, agents (records only), files (metadata only), search (Postgres full-text), webhook-endpoints with signed delivery, audit-events, ui-config, and realtime (SSE events, presence, typing). Everything is persisted in Postgres (raw SQL via `pg`; TypeORM only runs migrations) with Redis for sessions, rate limits, idempotency, presence and pub/sub fan-out — design in [data-model/scaling.md](./internal-docs/data-model/scaling.md). Every endpoint is tenancy-checked (non-members get 404) and RBAC-gated via CASL (`admin`/`member` roles, see [api/permissions.md](./internal-docs/api/permissions.md)). `apps/web` has a Tailwind + shadcn-conventioned shell driven entirely by the resolved `UiConfig` (see [ui/](./internal-docs/ui/)) — nav rail, channel list, topbar, and composer slots only; no message history, no settings UI yet. See [product/04-implementation-roadmap.md](./internal-docs/product/04-implementation-roadmap.md) for what's not built yet: agent runs/harnesses, automations, the retrieval/semantic-search pipeline, file blob storage, API keys, Slack import, and the MCP server. Version `0.1.0` of the API matches the OpenAPI `info.version` field.
