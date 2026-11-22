# MCP resources

## `wire://workspace/{workspace_id}`

MIME: `application/json`

Contains: `name`, `member_count`, `agent_count`, `retention_policy`, `search_index_status`.

## `wire://channel/{channel_id}`

MIME: `application/json`

Contains: channel metadata, `topic`, `member_count`, `recent_messages` (max 20, truncated bodies).

## `wire://message/{message_id}`

MIME: `application/json`

Full message including `blocks`, `reactions_summary`, `thread_reply_count`, `citation_uri`.

## `wire://agent/{agent_id}`

MIME: `application/json`

Public agent profile: `handle`, `display_name`, `harness_summary`, `policies`, `status`. Excludes secrets.

## `wire://context-pack/{context_pack_id}`

MIME: `application/json`

Pack ready for injection: `sources[]`, `token_count`, `assembled_text` (if policy allows).

## Subscription behavior

When the host calls `resources/subscribe`, Wire pushes `notifications/resources/updated` on:

- `message.created` in subscribed channel resources
- `agent.run.completed` for subscribed agent resources
- `context_pack.created` for pending pack subscriptions

ETag returned as `version` field; hosts send `If-None-Match` on re-read.