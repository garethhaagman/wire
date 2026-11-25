# Competitive landscape

## Three different categories Wire gets compared to — don't conflate them

### 1. Team chat incumbents (Slack, Microsoft Teams, Discord)

Wire is **not** trying to out-UX these for human-to-human chat (`product/01-vision.md` explicitly scopes rich client UI out of v0.1). The comparison that matters is the bot/integration layer: Slack's bot API treats bots as second-class app installs with rate limits and an approval-heavy app directory; Wire treats agents as first-class members with identity, budgets, and audit trails from the data model up (`product/03-agents.md`). Lead with that gap, not chat features — `product/05-feature-parity.md` already tracks where Wire is behind (link unfurl, custom emoji, calls) and is honest about it; don't oversell parity before it's shipped.

**Where incumbents still win**: ecosystem size, mobile apps, calls/huddles, years of polish. Don't contest these; the wedge audience doesn't pick a messaging tool for mobile push notifications.

### 2. Agent orchestration frameworks (LangGraph, CrewAI, AutoGen, OpenAI Swarm-style tools)

These are **not competitors**, they're potential upstream callers. They orchestrate _how_ an agent thinks/plans; Wire provides _where agents live_ — durable identity, permissions, a channel/thread substrate, and governance (approval gates, budgets) that orchestration frameworks don't attempt to solve. A LangGraph agent could use Wire as its "workspace" the same way a human uses Slack. This should be explicit in positioning so technical buyers don't dismiss Wire as "another agent framework" — it's infrastructure one layer below that.

### 3. Agent-ops / observability platforms (LangSmith, Langfuse, Helicone-style trace/eval tooling)

Adjacent, partial overlap: Wire's `AgentRunStep` tracing and `GET /v1/agent-runs/{id}/trace` (`harnesses/harnesses.md`) covers _some_ of what these tools do, but Wire's trace data is a byproduct of being the messaging substrate, not a standalone observability product. Don't try to out-feature dedicated eval/observability tooling — if a customer wants deep eval tooling, Wire's OTel-compatible trace export should make it easy to pipe into one of these, not compete with it.

## The actual white space

Nobody else combines: (a) a real multi-user conversation substrate, (b) first-class agent identity/governance, and (c) MCP as a native distribution mechanism, in one self-hostable, API-first product. The closest adjacent category is internal "ChatOps" tooling bolted onto Slack via bots — which inherits all of Slack's second-class-bot limitations by construction. That's the gap to repeat in every piece of positioning copy.

## Risk: a chat incumbent ships agent-identity features

The biggest competitive risk isn't a startup — it's Slack or Teams shipping a first-class "agent member" primitive themselves, given they have the distribution. Mitigate by moving fast on the self-hosted/open/MCP-native angle, which a large incumbent is structurally slow to match (they won't open-source their chat platform or go self-hosted-first). This should inform how aggressively the open-core/OSS decision in [pricing/packaging.md](../pricing/packaging.md) gets made — openness is a moat against incumbents copying the feature but not the distribution model.
