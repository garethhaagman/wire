# GTM strategy

## Motion: product-led, developer-first, open-core

Bottom-up adoption by developers via API + MCP, monetized later through Enterprise features and/or a hosted tier (see [pricing/packaging.md](../pricing/packaging.md)). No outbound sales motion until there's organic self-hosted adoption to sell _into_ — this sequencing matches the [icp-wedge.md](./icp-wedge.md) decision to lead with developers, not IT/compliance buyers.

## Phases

### Phase 0 — Prove the wedge (pre-revenue)

- Ship the MCP server and a working self-hosted Docker Compose quick-start (`stack/self-hosting.md`) as the two things a developer can try in under 15 minutes, matching the stated success metric in `product/01-vision.md`.
- Launch surface: a single compelling demo — an agent with real identity, posting into a channel, with the `agent_run_id` audit trail visible. This is the feature that doesn't exist anywhere else (Slack bots have no run/approval/audit model); it should be the entire narrative, not one bullet among many.
- Distribution: HN/Twitter/dev-newsletter launch, MCP server directory listings, "show your multi-agent setup" outreach. See [distribution-channels.md](./distribution-channels.md).

### Phase 1 — Land via self-hosted, expand via usage

- Free community tier removes the first adoption barrier (per [pricing/packaging.md](../pricing/packaging.md)).
- Expansion signal to watch: agent-run volume and number of distinct agents per workspace, not seat count — this is a usage-based product, and seat count will be a lagging/noisy signal given the target buyer.
- Build the **in-product upgrade trigger**: when a workspace's agent usage crosses a threshold, surface Team-tier features (SSO, longer audit retention) contextually rather than via a sales email.

### Phase 2 — Follow-on enterprise sale

- Once a handful of workspaces inside a larger org adopt bottom-up, run the compliance/governance sale into eng leadership using the exact artifact that's already true in production: audit logs, approval gates, budgets. This is cheaper and more credible than a cold compliance pitch because the proof is the customer's own data.
- This is also where the **Slack-migration wedge** re-enters: once Wire has production credibility inside an org, the import tool (`import/workspace-import.md`) becomes the expansion path to replace Slack usage entirely, not the opening pitch.

## Messaging hierarchy

1. **Primary**: "Agents are first-class members, not bots bolted onto a chat API." (differentiator vs. Slack/Teams/Discord)
2. **Secondary**: "One OpenAPI contract — your client, your MCP host, and your agents are all just callers." (differentiator vs. piecemeal bot-framework + separate-chat-tool stacks)
3. **Tertiary**: "Bring your Slack history on day one." (the import tool — powerful but should not lead, per wedge sequencing above)

## Competitive framing

See [competitive-landscape.md](./competitive-landscape.md) for the detailed comparison; the one-line version: Wire doesn't compete with Slack on chat UX, and doesn't compete with agent frameworks (LangGraph, CrewAI) on orchestration — it's the **durable, governed, multi-agent-and-human substrate** those frameworks post into, with MCP as the integration layer that makes it a peer of (not a replacement for) the harness ecosystem.

## What's missing to actually execute this (flag, don't build yet)

- No **changelog/launch-asset owner** or docs site named anywhere in the repo — this spec needs a public-facing docs site (likely generated partly from `api/openapi.yaml`) before Phase 0 can launch.
- No **design partner list** — Phase 0 needs 3-5 named teams willing to run the self-hosted stack pre-GA and give feedback; identify this before launch, not after.
