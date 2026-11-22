# Events, webhooks, and realtime

This is a distinct envelope from the synchronous HTTP response envelope ([responses.md](./responses.md)) — webhook payloads describe an event that happened, not the result of a request/response call, so they don't carry `success`/`error`/`meta`.

## Event envelope

All async integrations use a canonical envelope:

```json
{
  "id": "evt_01H...",
  "type": "message.created",
  "created_at": "2026-11-19T19:00:00Z",
  "workspace_id": "ws_abc",
  "data": { },
  "api_version": "2026-11-19"
}
```

Types are dotted namespaces; payload schemas are in OpenAPI components under `WebhookEvent*`.

## Delivery

- **Webhooks** — HTTPS POST with `Wire-Signature` (HMAC-SHA256), `Wire-Event-Id`, retry up to 72h.
- **SSE** — `GET /v1/stream` for members; filter by `types[]`, `channel_ids[]`.
- **WebSocket** — Optional; same subscription model as SSE for low-latency clients.

## Core event types (v0.1)

| Type | When |
|------|------|
| `message.created` | New message |
| `message.edited` | New revision |
| `thread.reply` | Reply in thread |
| `reaction.added` | Reaction |
| `channel.member.joined` | Membership change |
| `agent.run.started` | Run begins |
| `agent.run.completed` | Terminal state |
| `agent.run.awaiting_approval` | HITL gate |
| `automation.execution.started` | Automation fired |
| `automation.execution.completed` | Automation done |
| `file.indexed` | Searchable |
| `context_pack.created` | Pack ready |
| `import.completed` | Slack export ingest finished |
| `import.failed` | Terminal import failure |

Bulk import runs with `suppress_events: true` must **not** emit per-message webhooks; only terminal import events.

## Subscriptions

`POST /v1/webhook-endpoints` with `url`, `enabled_events[]`, optional `channel_filter`, `secret`.

Wire supports **event contracts**: consumers declare JSON Schema subsets; Wire validates outbound payloads in CI for enterprise.

## Ordering

Per `channel_id`, `message.*` events are ordered by `sequence`. Global ordering is not guaranteed; consumers use `sequence` for gap detection and `GET /v1/events/replay`.

## Automations as consumers

Automations subscribe internally—no HTTP hop for same-region deployments. Cross-region uses dedicated queue.

## Idempotency for consumers

Process `evt.id` once; duplicates possible at-least-once delivery.

## Realtime presence

Not replayed on webhooks; available only on SSE/WebSocket channels `presence` and `typing`.