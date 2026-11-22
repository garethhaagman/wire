# SDKs and client generation

## Why this is its own concern

`api/README.md` lists "recommended generators" (OpenAPI Generator, Speakeasy, Stainless) as a suggestion for *downstream consumers* to run themselves. That's insufficient for a PLG dev-first GTM motion ([gtm/icp-wedge.md](../gtm/icp-wedge.md)) — `npm install @wire/sdk` needs to be something Wire ships and owns, not something every integrator regenerates for themselves. A generic "bring your own generator" story is friction exactly at the top of the funnel this product is betting on.

## What gets generated vs. hand-written

| Layer | Generated | Hand-written |
|-------|-----------|----------------|
| Types (request/response shapes, enums) | Yes, from `api/openapi.yaml` → `@wire/types` ([stack/monorepo-layout.md](../stack/monorepo-layout.md)) | — |
| HTTP client (fetch wrapper, auth header injection, pagination helpers) | Base client generated | Idempotency-key helper, cursor-pagination iterator (`for await` ergonomics), retry/backoff — these are worth hand-tuning since generated clients are usually mediocre at exactly these three things |
| Realtime (SSE/WebSocket per `api/events-webhooks.md`) | No — most OpenAPI generators don't model streaming well | Hand-written subscription helper per language |
| MCP server | N/A — `mcp/mcp.md` tools are a thin adapter over the same OpenAPI operations, generated separately per that doc's existing CI-diff guarantee | — |

## Target languages, in priority order

1. **TypeScript** — the monorepo's own language; `@wire/sdk` is close to a thin public re-export of the internal `@wire/sdk-core` + `@wire/types` packages, so it should ship first and cheaply.
2. **Python** — second priority given the agent/ML ecosystem overlap with the dev-first ICP (notebooks, LangChain-adjacent tooling).
3. **Go** — third priority; useful for infra-minded self-hosting customers writing their own automation tooling, lower urgency than Python for the initial wedge.

Don't build a client for every language OpenAPI Generator supports — three well-maintained SDKs beat eight neglected ones, and a neglected SDK actively damages trust with the exact technical audience being courted.

## Versioning and release

Follows [api/versioning.md](../api/versioning.md): SDK major version mirrors API major version (`/v1` ↔ `@wire/sdk` v1.x); calendar-version changes within `/v1` ship as SDK patch releases. CI regenerates `@wire/types` on every `openapi.yaml` change and fails the build if a generated SDK doesn't compile against it — this is the same drift-prevention mechanism already specified for MCP tools (`mcp/README.md`), applied here too.

## Contract testing

A `tests/contract` suite (per [stack/monorepo-layout.md](../stack/monorepo-layout.md)) replays recorded OpenAPI examples through each generated SDK against a running `apps/api` instance in CI. This is what actually prevents "the SDK says this field is required but the API doesn't enforce it" bugs, which are the most common source of developer trust-loss in API-first products — and trust-loss here is disproportionately costly given the PLG motion depends on early developers having a smooth first integration.

## Distribution

- `npm` (TypeScript), `PyPI` (Python), `pkg.go.dev` (Go) — standard registries, no custom package hosting infrastructure needed (consistent with keeping Wire's own infra self-hosted per [stack/](../stack/), while still using public language registries for distribution — those are distribution channels, not infrastructure Wire runs).
- README/quickstart for each SDK should lead with the same "post your first agent message in under 15 minutes" goal as the top-level product metric (`product/01-vision.md`), not a generic API reference dump.
