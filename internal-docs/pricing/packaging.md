# Packaging

## Why this was missing

`product/03-agents.md` already models per-agent `budgets` (tokens/day, spend/month, max concurrent runs) and `automations/automations.md` has execution rate limits: the spec has billing _primitives_ with no billing _model_ wrapping them. That's a gap a buyer-facing team hits immediately: budgets imply someone pays for overage, and nothing says who, how, or at what price.

## Packaging axes

Two usage dimensions are structurally different and should be packaged separately rather than bundled into one blended seat price:

| Dimension       | Driven by                            | Scales with                                               |
| --------------- | ------------------------------------ | --------------------------------------------------------- |
| **Human seats** | Members with `member` role and above | Headcount, like any team chat tool                        |
| **Agent usage** | Agent runs, tokens, tool calls       | Automation intensity (can spike independent of headcount) |

Bundling both into a flat per-seat price punishes exactly the behavior Wire wants to encourage (teams wiring up more agents), so agent usage should be metered separately from seats, not folded into a per-seat multiplier.

## Proposed tiers (self-hosted-first)

Given the self-hosted, no-managed-services stack ([stack/](../stack/)), "plan" mostly gates **support + compliance features**, not infrastructure Wire runs for the customer: most customers run their own Postgres/object-store regardless of tier.

| Tier                             | Who                                                                                 | Seats     | Agent usage                                                   | Gated features                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Community / self-hosted free** | PLG wedge: dev teams, OSS, small startups ([gtm/icp-wedge.md](../gtm/icp-wedge.md)) | Unlimited | Soft cap, self-metered (no billing enforcement, honor system) | Core API, MCP server, agents, automations, Slack import: everything in `product/` and `api/` at v0.1 scope                                                                            |
| **Team**                         | Paying self-hosted customers wanting support                                        | Unlimited | Metered, billed overage                                       | SSO/SAML, audit log retention beyond 30 days, priority support                                                                                                                        |
| **Enterprise**                   | Compliance-driven buyers ([gtm wedge 3](../gtm/icp-wedge.md))                       | Unlimited | Metered, custom commit                                        | Data residency pinning, legal hold, external runners, MCP federation, compliance exports (all already scoped as "Enterprise" phase in `product/04-implementation-roadmap.md` Phase 6) |

This maps directly onto the existing roadmap phases: Enterprise-tier features are exactly Phase 6. **Don't invent new gated features; gate what's already phased.**

## Open-core framing

Given the PLG/bottom-up GTM wedge, the natural model is **open-core**: the self-hosted runtime (api, worker, mcp-server, the full `product/` + `api/` + `automations/` surface) is source-available or fully open, and Wire charges for (a) a hosted/managed offering for teams who don't want to run Postgres themselves, and (b) Enterprise features + support contracts for self-hosters. This needs an explicit decision (see open question below) because it changes the license file, the repo's public/private split, and the GTM motion in [gtm/distribution-channels.md](../gtm/distribution-channels.md).

## Open questions (flag before building billing)

- Does Wire also offer a **hosted** (Wire-run) option, or is it self-hosted-only with a support/license business model? This changes whether [pricing/metering-billing.md](./metering-billing.md) needs a usage-based invoicing pipeline at all, or just license-key gating.
- License for the open-core boundary (e.g. BSL, Apache + separate Enterprise repo): affects the OSS positioning in GTM.
