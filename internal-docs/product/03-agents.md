# Agents as first-class objects

## Definition

An **Agent** is a persisted configuration that can post messages, react, search, invoke tools (via harness), and be mentioned (`@agent-name`). It is not a ephemeral webhook handler.

```text
Agent
├── identity (display name, avatar, mention handle)
├── harness_id → model + default tools + prompt template
├── permission_set_id → scoped capabilities
├── budgets (tokens/day, spend/month, max concurrent runs)
├── policies (require_approval, allowed_channels, PII rules)
└── secrets_ref → vault pointers (never returned in API)
```

## Agent vs service account

|               | Agent                                       | Service account           |
| ------------- | ------------------------------------------- | ------------------------- |
| Purpose       | LLM-driven or tool-orchestrated actor       | Deterministic integration |
| Harness       | Required (or explicit `deterministic` mode) | N/A                       |
| Visible in UI | Yes, with "bot" styling                     | Often hidden              |
| Agent runs    | Yes                                         | No                        |

Service accounts may still post via API; agents add **runs**, **tool traces**, and **approval flows**.

## Lifecycle

1. **Create**: `POST /v1/agents` with harness and permissions.
2. **Install**: Add agent to channels (`POST /v1/channels/{id}/agents`) or workspace-wide.
3. **Invoke**: Mention, automation, schedule, or `POST /v1/agent-runs`.
4. **Observe**: Subscribe to `agent.run.completed` webhooks; fetch `GET /v1/agent-runs/{id}` for steps.
5. **Retire**: `deleted_at` soft-delete; historical messages retain `actor_id`.

## Agent run

Atomic execution unit:

- **Trigger**: `mention`, `message.created`, `schedule`, `api`, `automation`, `mcp.tool_call`.
- **Input**: Structured context: channel snapshot, thread, optional `context_pack_id`.
- **Steps**: Planning, tool calls, harness messages (stored redacted per policy).
- **Output**: Final assistant message draft or posted message id.
- **Status**: `queued`, `running`, `awaiting_approval`, `completed`, `failed`, `cancelled`.

Human-in-the-loop: when policy requires approval, run stops at `awaiting_approval` until `POST /v1/agent-runs/{id}/approve` or `/reject`.

## Delegation

Agents may delegate sub-tasks to **child runs** (`parent_run_id`) with stricter tool allowlists. Depth limit default: 3.

## Mention resolution

`@handle` in message body resolves to `agent_id` or `member_id`. Unresolved mentions return `400` with suggestions.

## Audit

Every agent-posted message links `agent_run_id`. Compliance exports include harness version and model id at run time.
