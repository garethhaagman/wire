# Distribution channels

Ranked by expected leverage for the dev-first PLG wedge ([icp-wedge.md](./icp-wedge.md)), not by effort required.

## 1. MCP server as the distribution unit

The single highest-leverage channel available, because it's a product capability that _is_ a distribution channel: `npx @wire/mcp-server` installs into Claude Desktop, Cursor, or any MCP host with no Wire-specific onboarding flow beyond auth (`mcp/README.md`). Concretely:

- List on MCP server directories/registries as they mature as a discovery surface.
- Ship install snippets for each major host (Claude Desktop, Cursor, Claude Code) in `mcp/README.md` and the public docs site. Currently only a generic pattern is documented; host-specific copy-paste configs convert better than generic instructions.
- The MCP **prompts** (`wire_summarize_thread`, `wire_draft_reply`, `wire_triage_channel`) are themselves demo-able in under a minute; use them as the "aha" moment in any walkthrough.

## 2. Docs-as-product

`api/openapi.yaml` being canonical means a generated, interactive API reference (Stripe/Twilio-style) is nearly free to produce and is often how developers evaluate infra tools before ever talking to anyone. Pair with the generated SDKs ([sdks/](../sdks/)) so "try it" means `npm install @wire/sdk` + a copy-paste snippet, not reading YAML.

## 3. Open-source surface area

Depends on the open-core licensing decision in [pricing/packaging.md](../pricing/packaging.md), but if the self-hosted runtime is source-available, GitHub becomes a channel in its own right: stars, issues, and PRs are marketing, and a well-run OSS repo (good README, CONTRIBUTING, responsive issues) compounds with the dev-first wedge. The existing spec-only repo's documentation quality (this one) is already a credible starting point for that README.

## 4. Technical content marketing

- Write-ups of the specific design decisions that are genuinely novel: the agent-run/approval/audit model, context packs, harness abstraction. These are "we solved a real problem" posts, not generic content marketing, and they target exactly the developer audience who evaluates infra by reading the design, not the landing page.
- The feature-parity matrix (`product/05-feature-parity.md`) is unusually good content as-is: a public "Slack parity tracker" blog post/page builds trust with the migration-curious segment without having to claim parity prematurely.

## 5. Direct outreach into visible agent builders

Teams publicly building multi-agent systems (GitHub repos, conference talks, Twitter) are identifiable and reachable without a sales team: a founder/dev-rel-style "we built the thing you're duct-taping together" outreach to a short list is higher-converting than broad-spectrum marketing at this stage.

## 6. Partnerships (sequence later)

- Model providers (Anthropic, OpenAI) and harness/agent-framework projects (LangGraph, CrewAI) are potential integration partners once Wire has real usage to point to; premature partnership outreach before there's a working self-hosted product to integrate against wastes the relationship.
- IDE/host vendors (Cursor, etc.) for deeper-than-MCP integration is a later-stage conversation, not a launch channel.

## Explicitly not a channel at launch

Paid acquisition (ads, sponsorships): this audience is ad-resistant and the product isn't legible enough yet to convert cold paid traffic; money is better spent on docs/content quality and design-partner support.
