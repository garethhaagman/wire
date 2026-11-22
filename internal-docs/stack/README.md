# Stack and technology

Normative-ish engineering direction for implementing the Wire spec. The rest of this repo (`product/`, `api/`, `data-model/`, etc.) is implementation-agnostic by design; this folder is where that changes — it commits to a specific stack so a build team isn't blocked re-deciding infrastructure per phase.

| Doc | Contents |
|-----|----------|
| [architecture.md](./architecture.md) | Service boundaries, request flow, why self-hosted |
| [monorepo-layout.md](./monorepo-layout.md) | TypeScript monorepo structure, shared packages, tooling |
| [infra-pulumi.md](./infra-pulumi.md) | Pulumi (TypeScript) stacks, environments, self-hosted topology |
| [self-hosting.md](./self-hosting.md) | What "no managed services" means in practice, operator runbook surface |

## Non-negotiables (from product direction)

- **TypeScript monorepo** — one repo, strict mode everywhere, no implicit `any`.
- **Pulumi (TypeScript)** for IaC — infrastructure defined in the same language as the app; no Terraform/CloudFormation YAML.
- **Self-hosted, no managed services** — Postgres, object storage, queue, cache, and search all run as containers Wire operates, not vendor SaaS (no RDS, no managed Kafka, no Pinecone).
- **Docker** as the only deployment unit — every service ships as an image; Pulumi provisions the hosts/orchestration that run them.
- **Postgres** as the single system of record — including vectors (via `pgvector`) and full-text (via `tsvector`), not a bolted-on separate search cluster for v1.
- **Shared types package** — API request/response types, event payloads, and domain enums are generated once from `api/openapi.yaml` and consumed by every service and SDK.
- **Modules/packages in TypeScript** — business logic lives in versioned internal packages (`@wire/*`), not copy-pasted across services.
