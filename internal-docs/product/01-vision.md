# Vision

## Problem

Team messaging tools optimized for human chat treat integrations as afterthoughts: bots are second-class, search is lexical, automations are opaque, and LLM agents have no stable identity or permission model inside the product.

## Wire

Wire is messaging infrastructure where **conversation is the system of record** and **agents are members** with the same governance primitives as people. External systems interact through a single OpenAPI contract, optional MCP exposure, and event streams, not through brittle screen scraping or undocumented internal APIs.

## Goals

0. **Import-first onboarding**: [Slack admin export](../import/workspace-import.md) is the default path to capture users and **backdated** history; greenfield invite is secondary.
1. **Unified actor model**: Humans, service accounts, and agents appear in member lists, presence, and audit logs with clear `actor_type`.
2. **Programmable workspace**: Channels, messages, reactions, files, and custom object types are CRUD-able and subscribable.
3. **Agent execution plane**: Schedule or event-triggered agent runs with tool allowlists, budget caps, and human-in-the-loop checkpoints.
4. **High-quality retrieval**: Hybrid lexical + vector search, thread-aware chunking, and exportable **context packs** for harness prompts.
5. **Automation fabric**: Versioned automation definitions composed of triggers, conditions, and actions (including `invoke_agent`).

## Non-goals (v0.1)

- Bespoke per-feature UI specs beyond the config-driven shell: see [ui/](../ui/) for what _is_ in scope, a typed, customizable configuration system and a minimal shell proving it, not a full page-by-page UI spec for channels/threads/messages.
- End-user email/SMS bridging (may arrive later as connectors).
- Arbitrary code execution inside Wire workers (automations call HTTP actions and registered agents only).
- Single-vendor model lock-in (harness abstraction is mandatory).

## Success metrics (product)

- Time-to-first-agent-message via API &lt; 15 minutes for a new developer.
- P95 search latency &lt; 300ms for workspaces under 10M chunks.
- 100% of user-visible agent actions attributable to an `Agent` + `AgentRun` id in audit logs.
