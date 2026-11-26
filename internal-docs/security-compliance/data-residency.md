# Data residency and multi-tenant isolation

## What's already specified

`api/auth-tenancy.md` defines `data_region` as a workspace setting (`us`, `eu`) that "pins storage and search," with `X-Wire-Region` echoed on responses. That's the _policy_ surface. This doc covers the _enforcement_ surface, which matters more once the stack is self-hosted-by-default ([stack/](../stack/)) rather than a multi-region managed cloud.

## Self-hosted changes what "region pinning" means

In a managed multi-region SaaS, `data_region` would route to a regional database cluster Wire operates. In Wire's self-hosted model, **each self-hosted deployment is already regionally scoped by where the operator runs it**: a customer in the EU self-hosting in their own EU datacenter satisfies residency by construction, with no Wire-side region router needed. `data_region` still matters for:

- **The hosted tier**, if one exists (open question in `pricing/packaging.md`): there, Wire does need real regional infrastructure separation.
- **Enterprises self-hosting across multiple regions from one Wire deployment** (e.g. a single org with EU and US workspaces on infra they run in both regions): here `data_region` becomes a routing hint the operator's own Pulumi topology must honor (separate Postgres instances per region, workspace-to-instance mapping), not something Wire's application layer can enforce on infra it doesn't control.

**Gap**: the spec doesn't say which of these is the primary scenario. Resolve before building region-routing logic: it's a materially different engineering task (one Postgres connection string vs. a sharding/routing layer) depending on the answer.

## Multi-tenant isolation (self-hosted single-deployment case)

The common case (one self-hosted deployment serving one org's multiple workspaces on one Postgres instance, per `stack/architecture.md`) needs explicit isolation guarantees that aren't yet written anywhere:

| Isolation concern                 | Current state                                                     | Needed                                                                                                                                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Row-level tenant isolation**    | `workspace_id` FK on every table (`data-model/data-model.md`)     | Postgres **Row-Level Security (RLS)** policies keyed on `workspace_id`, not just application-layer `WHERE` clauses: defense in depth against a query-layer bug leaking cross-workspace rows                                      |
| **Noisy-neighbor resource caps**  | Workspace-level rate limits exist for automations (1000/min)      | No documented cap on agent-run concurrency, search query load, or storage per workspace sharing one self-hosted Postgres instance: a single workspace's runaway agent could degrade every other workspace on the same deployment |
| **Search/vector index isolation** | `acl_channel_ids` on `search_chunks` (`data-model/data-model.md`) | Confirmed row-level, which is good, but `pgvector` index performance on a shared table across many workspaces should be load-tested; may need per-workspace partitioning if a deployment hosts many large workspaces             |

Recommend adding RLS policies to the `packages/db` migration set ([stack/monorepo-layout.md](../stack/monorepo-layout.md)) as a baseline hardening step: cheap to add now, expensive to retrofit after data exists.

## Legal hold and data residency interaction

`retrieval/retrieval.md` and `import/workspace-import.md` both reference legal hold (freezes delete/tombstone, blocks `replace_history` re-import). Confirm legal hold state travels with `data_region` correctly if the multi-region self-hosted scenario above is real: a hold placed in one region's deployment needs a documented process for multi-deployment orgs, since there's no central Wire-side enforcement point across independent self-hosted instances.
