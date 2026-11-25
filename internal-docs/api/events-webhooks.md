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
  "data": {},
  "api_version": "2026-11-19"
}
```

Types are dotted namespaces; payload schemas are in OpenAPI components under `WebhookEvent*`.

## Delivery

- **Webhooks** — HTTPS POST with `Wire-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`, `Wire-Event-Id`, `Wire-Event-Type`, `Wire-Delivery-Attempt`. Non-2xx or timeout (10s) retries with jittered exponential backoff (10s·2ⁿ, capped at 6h) for up to 72h / 20 attempts. Redirects are not followed; in production, hosts resolving to private/loopback/link-local addresses are refused at delivery time.
- **SSE** — `GET /v1/workspaces/{workspaceId}/events/stream`; filter with `types` and `channel_ids` (comma-separated or repeated). Each frame's `id:` is the event's workspace `seq`; reconnect with `Last-Event-ID` (or `?after_seq=`) to resume without gaps. If the client is too far behind (> 5000 events) the server sends a `resync` event and the client should refetch state. Events are filtered per connection by channel visibility.
- **Replay** — `GET /v1/workspaces/{workspaceId}/events?after_seq=` (cursor-paginated), 7-day retention.
- **WebSocket** — Not implemented; same subscription model as SSE when it lands.

### How delivery works

Every mutation writes its events to an `events` outbox table **in the same transaction** as the change, so an event exists if and only if the change committed. A relay (`OutboxRelayService`, any number of replicas, `FOR UPDATE SKIP LOCKED`) moves committed events to Redis pub/sub for SSE fan-out and into `webhook_deliveries` jobs for `WebhookDeliveryWorker`. Delivery is at-least-once on both paths: dedupe on `id`.

## Core event types (v0.1)

| Type                             | When                         |
| -------------------------------- | ---------------------------- |
| `message.created`                | New message                  |
| `message.edited`                 | New revision                 |
| `thread.reply`                   | Reply in thread              |
| `reaction.added`                 | Reaction                     |
| `channel.member.joined`          | Membership change            |
| `agent.run.started`              | Run begins                   |
| `agent.run.completed`            | Terminal state               |
| `agent.run.awaiting_approval`    | HITL gate                    |
| `automation.execution.started`   | Automation fired             |
| `automation.execution.completed` | Automation done              |
| `file.indexed`                   | Searchable                   |
| `context_pack.created`           | Pack ready                   |
| `import.completed`               | Slack export ingest finished |
| `import.failed`                  | Terminal import failure      |

Bulk import runs with `suppress_events: true` must **not** emit per-message webhooks; only terminal import events.

## Subscriptions

`POST /v1/workspaces/{workspaceId}/webhook-endpoints` with `url`, `enabledEvents[]` (event types or `"*"`), optional `channelFilter[]`. Wire generates the `whsec_` signing secret and returns it once in the create response; it's stored encrypted (AES-256-GCM) and never returned again.

Wire supports **event contracts**: consumers declare JSON Schema subsets; Wire validates outbound payloads in CI for enterprise.

## Ordering

Per `channel_id`, `message.*` events are ordered by `sequence`. Global ordering is not guaranteed; consumers use `sequence` for gap detection and `GET /v1/events/replay`.

## Automations as consumers

Automations subscribe internally—no HTTP hop for same-region deployments. Cross-region uses dedicated queue.

## Idempotency for consumers

Process `evt.id` once; duplicates possible at-least-once delivery.

## Realtime presence

Not replayed on webhooks; available only on SSE as `presence.online` and `typing` events. Clients heartbeat with `POST /v1/workspaces/{id}/presence` (the SSE stream also heartbeats while open); `GET` the same path lists members active in the last 60s. `POST /v1/channels/{id}/typing` is throttled server-side to one broadcast per member per channel every 3s.
