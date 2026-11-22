# Implementation roadmap (suggested)

Build phases for an implementation team. Status annotations reflect `apps/api`'s actual state, not just the spec — see root [README.md § Status](../../README.md#status) for the one-line summary.

## Phase 1 — API core + import

- Workspaces, members (invites + claim), channels (public/private/dm/group_dm, membership, archive, unread/read cursors), messages (edit history, tombstones), threads — **implemented**, Postgres-backed; see [data-model/scaling.md](../data-model/scaling.md)
- Reactions, pins, bookmarks — **implemented**
- Files (metadata) — **implemented** for metadata only; no blob storage (signed upload URLs) or virus scan
- Search (keyword only) — **implemented** on Postgres full-text search with the channel ACL in SQL; no semantic/hybrid search
- Webhooks — **implemented**: endpoint CRUD, transactional outbox, signed delivery worker with retries
- Realtime — **implemented**: SSE stream with resume, presence, typing (Redis pub/sub fan-out)
- Audit log — **implemented**: every successful mutating request is recorded automatically (`AuditInterceptor`)
- **Slack export import** (`/workspaces/from-import`, backdated timestamps, claim flow) — not started
- OAuth + API keys — not started (session-cookie auth via Better Auth exists; no `wire_sk_`/`wire_at_` token model)
- OpenAPI validation gateway (reject unknown fields) — not started (requests are validated by DTO shape via `class-validator`, but unknown-field rejection isn't enforced)

## Phase 2 — Agents

- Harness CRUD, managed runner for Anthropic + OpenAI — not started (agents exist as records; no execution)
- Agent runs, approval gates, trace storage — not started
- `@handle` mention parsing — not started

## Phase 3 — Retrieval

- Ingest pipeline, hybrid search, context packs — not started
- File upload + text extraction — not started (file metadata only, see Phase 1)

## Phase 4 — Automations + events

- Internal event bus, webhooks, SSE — webhook-endpoint *subscriptions* exist (Phase 1); no event bus, no delivery, no SSE
- Automation executor with idempotency — not started

## Phase 5 — MCP

- Generate MCP from OpenAPI `x-wire-mcp-tool` — not started
- OAuth MCP token endpoint — not started
- Resource subscriptions — not started

## Phase 6 — Enterprise

- External runners, data residency, legal hold — not started
- MCP federation proxy, connector marketplace — not started
