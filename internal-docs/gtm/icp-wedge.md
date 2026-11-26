# ICP and wedge

## Primary wedge: dev teams building AI agents (PLG, bottom-up)

Confirmed direction. Target buyer is a developer or platform engineer already building or operating LLM agents who needs **agent-native messaging infra**: identity, permissions, audit trails, and tool access for agents, not a chat UI with a bolted-on bot API. This is the audience `product/01-vision.md`'s problem statement is written for ("bots are second-class, search is lexical, agents have no stable identity").

### Why this wedge fits the product as specced

- The **MCP server** (`mcp/`) is a self-serve, zero-sales-call distribution surface: `npx @wire/mcp-server`, point Claude/Cursor/custom runner at it, done. This is the single best PLG hook in the spec and should be the headline of every dev-facing GTM asset.
- **API-first** means there's a real product to try without talking to sales: `product/01-vision.md`'s own success metric is "time-to-first-agent-message via API &lt; 15 minutes for a new developer." That metric _is_ the PLG funnel's top-of-funnel conversion target; instrument it.
- **Harness-neutral** (Claude, OpenAI, custom HTTP) matters to this buyer specifically: they've likely already got opinions about model choice and don't want lock-in.

### Who, concretely

- Platform/infra engineers at AI-forward startups building internal agent tooling (the kind of team that would otherwise hand-roll a Postgres table of "bot messages" and regret it in 6 months).
- Open-source maintainers and indie devs experimenting with multi-agent systems who need somewhere agents can "live" with real identity, not a Discord webhook hack.
- Eng teams already using Slack who are frustrated by **Slack's bot/API rate limits and app-approval friction** for agent-heavy use cases: this is a secondary pull into the wedge, not the primary motion (that's wedge 2 below).

### Not the initial wedge (sequence later)

- **Slack-dissatisfied orgs / migration buyers** (IT/ops-led, lead with import tool): real opportunity, but the import tool's value compounds _after_ there's a credible agent-native product people already trust; leading with "replace Slack" invites feature-parity scrutiny before Wire has earned it. Revisit once feature parity (`product/05-feature-parity.md`) closes more gaps, especially the acknowledged ones (notification delivery, link unfurl, custom emoji).
- **AI-ops/compliance buyers** (eng leadership, governance angle): this is where Enterprise tier revenue comes from ([pricing/packaging.md](../pricing/packaging.md)), but it's a _follow-on_ sale into accounts that adopted bottom-up first, via the same "every agent action has an `agent_run_id` in audit logs" feature, not a cold-start wedge, since compliance buyers want proof of production usage, not a spec.

## Anti-ICP (don't chase)

- Teams wanting a pure human-chat Slack replacement with no agent ambitions: Wire's whole value prop is the agent-native layer; competing on chat UX alone against Slack/Teams is a losing fight for a small team (per `product/01-vision.md` non-goals: rich client UI explicitly out of scope).
- Enterprises wanting a fully-managed SaaS with zero self-hosting ops: until/unless a hosted tier exists (open question in [pricing/packaging.md](../pricing/packaging.md)), this buyer will bounce off the self-hosted requirement.

## First 10 customers, operationally

Expect them to come from: MCP directory/marketplace listings, HN/Twitter launch around "Slack for agents," and direct outreach into teams already publicly building multi-agent systems (visible via GitHub, conference talks). See [distribution-channels.md](./distribution-channels.md) for channel detail.
