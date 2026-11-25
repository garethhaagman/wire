# Agent harnesses

## Harness abstraction

A **Harness** binds a language model provider, inference parameters, tool wiring, and prompt templates. Wire stores harness definitions; **execution** may occur on Wire workers or customer-hosted **runners** (hybrid).

```text
Harness
├── provider (anthropic | openai | google | azure_openai | custom_http)
├── model_id
├── parameters (temperature, max_tokens, ...)
├── system_prompt_template (Handlebars-like, workspace variables)
├── tool_policy (inherit_agent | explicit_list | none)
├── streaming (boolean)
└── runner (managed | external_webhook)
```

## First-class providers (v0.1)

| Provider    | Notes                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| Anthropic   | Messages API; tool use; prompt caching hints on context packs                           |
| OpenAI      | Chat Completions / Responses API mapping layer in worker                                |
| Custom HTTP | `POST` to customer URL with Wire-signed payload; returns assistant message + tool calls |

Wire does not embed vendor SDKs in the public API; harness records are portable JSON.

## Claude / Anthropic path

- Agent run worker loads `context_pack` + thread slice + tool definitions.
- **Computer use** and other vendor-specific tools are opt-in via `harness.extensions.anthropic.*`.
- Store `message.id` from provider in `AgentRunStep.provider_ref` for support correlation.

## OpenAI path

- Same step model; function tools mapped from Wire **native tools** (search, post_message) and **MCP bridge tools** when enabled.
- Reasoning models: expose `harness.parameters.reasoning_effort` when supported.

## Cursor and IDE agents

Cursor (and similar) typically connect via **MCP + user OAuth** rather than hosted harness:

1. User installs Wire MCP in Cursor.
2. Cursor session uses member token; `@wire` style workflows call `search_hybrid` and `post_message`.
3. Optional: register a **shadow agent** per user linking Cursor session id for audit (`agent.metadata.source: cursor`).

## External runners

Enterprises run agents inside VPC:

1. Harness `runner.type = external_webhook`.
2. Wire sends `agent.run.started` to signed URL with full input envelope.
3. Runner callbacks `PATCH /v1/agent-runs/{id}/steps` and `POST .../complete`.

## Tool routing during runs

Execution order:

1. Wire-native tools (always allowed if in permission set).
2. Workspace-installed **connectors** (GitHub, Linear, etc.) as additional tools.
3. MCP **federation**: agent may call declared remote MCP servers through Wire gateway (tool proxy with audit).

## Observability

Each step records latency, token usage, estimated cost, and truncated I/O. Export via `GET /v1/agent-runs/{id}/trace` (OTel-compatible JSON optional).

## Versioning

Harnesses are immutable once referenced by a published agent version. Updates create `harness_id` v2 and `agent.harness_version` bump.
