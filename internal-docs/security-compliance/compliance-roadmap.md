# Compliance roadmap

## Why this matters earlier than it looks

The follow-on enterprise sale in [gtm/strategy.md](../gtm/strategy.md) Phase 2 is gated on compliance credibility, not just feature completeness — a buyer moving from bottom-up dev adoption to an enterprise contract will ask for SOC 2 (at minimum a Type I report / roadmap) before signing, even if the actual security posture is already good. Start the control-mapping work now, while the spec is being written, because controls are far cheaper to build into the data model than to retrofit.

## SOC 2 control mapping (what the spec already gives you)

| Trust Service Criterion | Already satisfied by | Still needed |
|---------------------------|------------------------|-----------------|
| **Security** (access control) | RBAC roles, scoped tokens, fine-grained channel ACLs (`api/auth-tenancy.md`) | RLS enforcement (`security-compliance/data-residency.md`), documented key-rotation procedure for `wire_sk_`/`wire_at_` tokens |
| **Availability** | None specified | Self-hosted deployments need a documented uptime commitment *per operator*, not a Wire SLA — clarify this is operator-owned for self-hosted, Wire-owned only for a hosted tier if one exists |
| **Processing integrity** | Idempotency keys on automations/webhooks (`automations/automations.md`), linearizable agent-run state transitions (`data-model/data-model.md`) | Good foundation already |
| **Confidentiality** | DLP redaction profiles, encryption-at-rest for import zips (`import/workspace-import.md`), secrets never returned (`product/03-agents.md`) | Encryption-at-rest policy needs to be stated for the *primary* Postgres data too, not just import zips — self-hosted operators need this spelled out as a deployment requirement, not assumed |
| **Privacy** | Redaction profiles, legal hold, channel ACL enforcement on retrieval | Data subject access/deletion request flow (GDPR "right to erasure") isn't addressed anywhere — soft-delete tombstones (`data-model/data-model.md`) explicitly *preserve* data, which is in tension with erasure requests. Needs a documented hard-delete path distinct from the audit-preserving soft-delete, gated to compliance/admin scope |

## The open-core licensing decision affects this

If the self-hosted runtime is open-source ([pricing/packaging.md](../pricing/packaging.md)), **the compliance posture is largely the self-hosting customer's own responsibility** — Wire can ship a hardened-by-default configuration and documentation, but cannot certify someone else's deployment. SOC 2 as a Wire-held certification is really only meaningful for:

1. A Wire-hosted tier, if one exists.
2. Wire's own internal handling of anything that transits Wire infrastructure even in a self-hosted-primary model (e.g. license check-ins per `pricing/metering-billing.md`, if that path is built).

**Resolve the hosted-tier question (flagged in `pricing/packaging.md`) before committing to a SOC 2 timeline** — the scope of what's being certified is completely different in each case.

## Sequencing recommendation

1. **Now**: close the SSRF and delegation-width gaps from `security-compliance/threat-model.md` — these are correctness issues independent of any certification.
2. **Pre-Enterprise-sale**: formal threat model review + RLS enforcement + hard-delete/erasure path. This is "SOC 2 Type I-ready" posture, achievable without a formal audit.
3. **Post-first-Enterprise-contract**: actual SOC 2 Type II engagement with an auditor, once there's a paying customer whose procurement requires it — don't pay for an audit speculatively before it's a sales blocker.

## GDPR/data residency note

EU customers will ask about GDPR regardless of SOC 2 status. The erasure-path gap above is the main GDPR-specific hole; `data_region` pinning (`security-compliance/data-residency.md`) covers the data-transfer concern reasonably well for the self-hosted-in-EU case.
