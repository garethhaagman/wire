# Metering and billing

## What's already meterable in the spec (no new instrumentation needed)

| Signal                                | Source                                                     | Doc                                                              |
| ------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Agent run count, duration, tool calls | `AgentRunStep` latency/token/cost fields                   | `product/03-agents.md`, `harnesses/harnesses.md` § Observability |
| Token usage, estimated cost per step  | `GET /v1/agent-runs/{id}/trace`                            | `harnesses/harnesses.md`                                         |
| Automation executions                 | `execution_id` per run, rate-limited at 1000/min/workspace | `automations/automations.md`                                     |
| Storage                               | Files + search chunks per workspace                        | `data-model/data-model.md`                                       |
| Seats                                 | Active (non-deactivated, claimed) members per workspace    | `product/02-core-concepts.md`, `import/workspace-import.md`      |

Billing is a **read model over existing audit/trace data**, not a parallel tracking system: this keeps the metering pipeline honest (what's billed is what's auditable) and avoids double-instrumenting.

## New data model additions required

Neither `data-model/data-model.md` nor the OpenAPI spec currently has a billing resource. Minimum addition:

```text
### subscriptions
| Column          | Type   | Notes                                    |
|-----------------|--------|-------------------------------------------|
| id              | string | `sub_`                                    |
| org_id          | string | FK (billing is org-level, not workspace)  |
| tier            | enum   | community, team, enterprise               |
| seat_count      | int    | billable seats, derived or overridden     |
| usage_period_start/end | timestamp | current metering window          |
| status          | enum   | active, past_due, canceled                |

### usage_records
| Column        | Type    | Notes                                         |
|---------------|---------|-------------------------------------------------|
| id            | string  | `usg_`                                          |
| org_id        | string  | FK                                              |
| metric        | enum    | agent_run, token, automation_execution, storage_byte_day |
| quantity      | numeric |                                                   |
| period        | date    | daily rollup, aggregated from AgentRunStep/trace |
```

Billing is **org-level** (per `api/auth-tenancy.md`'s Organization → Workspace hierarchy), not per-workspace: this matches how the existing `org_id` / `workspace_id` split already works for SSO and org API keys.

## Self-hosted billing enforcement

For self-hosted deployments, Wire (the vendor) is **not in the request path**: there is no managed metering service to call out to (consistent with [stack/README.md](../stack/README.md)'s no-managed-services stance). Options, in order of how much trust they require:

1. **Honor-system community tier**: no enforcement, usage visible to the operator via `GET /v1/audit-events` and an admin dashboard; license terms require truthful self-reporting above free-tier thresholds.
2. **Periodic license-key check-in**: self-hosted deployment phones home a usage summary (seat count, agent-run count) on a schedule for Team/Enterprise tiers under contract, enforced by license expiry rather than request-time blocking.
3. **No enforcement, contract-only**: Enterprise deals are negotiated/audited like any enterprise software license, with no technical gate at all.

Recommendation: start with (1) for community, (3) for Enterprise (it's what enterprise buyers expect and avoids building a phone-home system that becomes a security review blocker during procurement; see [security-compliance/threat-model.md](../security-compliance/threat-model.md)).

## Billing for the hosted option (if offered)

If a Wire-hosted tier exists (open question in [packaging.md](./packaging.md)), usage rolls up through the same `usage_records` table and is invoiced via a standard payment processor integration (e.g. Stripe): this is the **one** place a third-party managed service is acceptable, since it's a business-operations dependency, not infrastructure the product runs on. Keep it isolated to a `billing-webhook` handler, not wired into the core request path.

## What not to build yet

Real-time spend throttling beyond the per-agent `budgets` already specced in `product/03-agents.md` (tokens/day, spend/month) is sufficient for v1 cost control. Don't build a separate real-time billing meter with its own rate limiter; reuse the existing budget enforcement and roll it up into `usage_records` asynchronously.
