# Architecture

## Why self-hosted, no managed services

Wire's buyers in the dev-tool/agent-ops wedge (see [gtm/icp-wedge.md](../gtm/icp-wedge.md)) are disproportionately likely to have compliance, data-residency, or cost reasons to run infrastructure themselves. Managed services (RDS, managed Kafka, hosted vector DBs) are faster to start with but become the thing enterprise self-hosters explicitly reject during procurement: "why does your self-hosted product still phone home to your cloud vendor." Owning the full stack as containers:

- Makes the on-prem/VPC story true, not aspirational.
- Removes a class of vendor dependency and billing surprise for operators.
- Keeps the infra surface small enough that one platform team can run it: this is a deliberate simplicity trade, not a scale flex.

The cost: Wire owns operational concerns (backups, failover, upgrades) that managed services would otherwise absorb. [self-hosting.md](./self-hosting.md) covers what that commits an operator to.

## Service boundaries

```text
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   api        │────▶│  postgres     │     │  object-store   │
│  (HTTP+SSE)  │     │ (pg + pgvector│     │ (self-hosted    │
│              │     │   + fts)      │     │  S3-compatible) │
└──┬───────┬───┘     └──────┬───────┘     └────────────────┘
   │       │                │
   │       ▼                ▼
   │  ┌──────────┐   ┌──────────────┐
   │  │ redis     │   │  worker       │
   │  │ (cache,   │   │ (agent runs,  │
   │  │  pub/sub) │   │  indexing,    │
   │  └──────────┘   │  automations, │
   │                  │  import jobs) │
   ▼                  └──────────────┘
┌─────────────┐
│  mcp-server  │  (thin adapter over api, same auth)
└─────────────┘
```

| Service        | Responsibility                                                                                                                                                  | Status  | Maps to spec                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------- |
| `api`          | HTTP + SSE surface, auth, RBAC; with `RUN_WORKERS=true` also runs the outbox relay and webhook delivery                                                         | Running | `api/openapi.yaml`                                |
| `postgres`     | Single system of record, relational + `tsvector` (+ `pgvector` later); also the job queue (`SKIP LOCKED` tables)                                                | Running | `data-model/`                                     |
| `redis`        | Reconstructible state only: session cache, rate limits, idempotency keys, presence, membership cache, realtime pub/sub fan-out. The API fails open if it's down | Running | [data-model/scaling.md](../data-model/scaling.md) |
| `worker`       | Agent runs, automation execution, import pipeline, indexing                                                                                                     | Planned | `product/03-agents.md`, `automations/`, `import/` |
| `mcp-server`   | MCP tools/resources/prompts, proxies to `api`                                                                                                                   | Planned | `mcp/`                                            |
| `object-store` | File uploads, import zips, exports (self-hosted S3-compatible, e.g. MinIO/Garage)                                                                               | Planned | `import/`, Files in `data-model/`                 |

The queue is **Postgres-backed** (`SKIP LOCKED` job tables: `events` outbox and `webhook_deliveries` today) to avoid a third stateful system; promote to NATS/Redis Streams only if queue depth or latency demands it. Redis is deliberately not a system of record: losing it costs cache warmth and in-flight presence, never data. Scaling details live in [data-model/scaling.md](../data-model/scaling.md).

## Request flow (example: agent mention)

1. Client posts message → `api` validates the request DTO → writes to Postgres → appends a `message.created` row to the `events` outbox in the same transaction.
2. The outbox relay fans the event out (Redis pub/sub for SSE, `webhook_deliveries` for webhooks, both implemented); `worker` will consume the same outbox, resolve `@mention` and enqueue an `agent_run` (planned).
3. `worker` builds context (thread slice or `context_pack`), calls harness provider, writes `AgentRunStep`s.
4. On completion, `worker` posts the reply message through the same `api` write path: agents never bypass the HTTP contract internally. This is the enforcement mechanism for "API-first": even first-party code is a client.

## Why Postgres for everything (v1)

`pgvector` and native FTS are good enough for the retrieval scale in [retrieval/retrieval.md](../retrieval/retrieval.md) (P95 &lt; 300ms target at &lt;10M chunks) without a second database. One backup/restore story, one connection pool to size, one thing to patch. Revisit only when a workspace's chunk count or query shape actually demands a dedicated vector/search engine, don't pre-build that path.

## What's explicitly not here

UI/frontend architecture is out of scope for this folder, see [ui/](../ui/) for the client UI stack and config system; [product/01-vision.md](../product/01-vision.md) still scopes a full per-feature UI spec out of v0.1.
