# Automations

## Overview

**Automations** are versioned definitions that react to Wire events and execute **actions**. They are editable via API and inspectable by agents (with permission).

```text
Automation (version N)
├── trigger
├── condition (optional, CEL or JSON Logic subset)
├── actions[]
├── enabled
└── created_by (member or agent)
```

## Triggers

| Trigger type       | Source event                              |
| ------------------ | ----------------------------------------- |
| `message.created`  | New message in channel(s) matching filter |
| `reaction.added`   | Specific emoji on pattern                 |
| `schedule.cron`    | Cron with workspace timezone              |
| `agent.run.failed` | Reliability workflows                     |
| `file.uploaded`    | MIME / size filters                       |
| `webhook.received` | Inbound signed URL per automation         |
| `manual`           | `POST /v1/automations/{id}/execute`       |

## Conditions

Evaluate on event payload + lightweight workspace queries (e.g. "author is not agent", "body contains link"). No arbitrary SQL; use **condition DSL** documented in OpenAPI `AutomationCondition`.

## Actions

| Action              | Behavior                                           |
| ------------------- | -------------------------------------------------- |
| `post_message`      | Post to channel/thread with templating             |
| `invoke_agent`      | Start agent run with mapped context                |
| `http.request`      | Signed outbound webhook (retries, idempotency key) |
| `set_channel_topic` | Metadata update                                    |
| `add_reaction`      | Signal or workflow marker                          |
| `delay`             | Wait N seconds (max 7 days)                        |
| `branch`            | Parallel or switch on condition                    |

Templating uses `{{event.*}}` and `{{workspace.*}}` with strict escaping.

## Idempotency and delivery

Each automation execution has `execution_id`. Actions that mutate state accept `Idempotency-Key` derived from `execution_id` + action index.

Failed actions retry with exponential backoff unless `on_error: halt|continue`.

## Agent-authored automations

Agents with `automations:write` may create drafts; **publish** requires human approval if `workspace.policy.agent_automation_publish_requires_approval` is true (default true).

## Limits (defaults)

- 50 actions per automation.
- 1000 automation executions / minute / workspace (burst).
- HTTP action timeout 30s, response body capped at 64KB stored.
