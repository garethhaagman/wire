# Trigger and action configuration

## Trigger filters (`message.created`)

| Key                  | Type     | Description        |
| -------------------- | -------- | ------------------ |
| `channel_ids`        | string[] | Restrict channels  |
| `body_contains`      | string   | Substring          |
| `author_actor_types` | string[] | `human`, `agent`   |
| `has_file`           | boolean  | Attachment present |

## Action: `invoke_agent`

| Key                        | Required | Description                      |
| -------------------------- | -------- | -------------------------------- |
| `agent_id`                 | yes      | Target agent                     |
| `input_template`           | no       | Templated user message           |
| `context_pack_from_search` | no       | Nested search request object     |
| `channel_id`               | no       | Override channel for run context |
| `thread_root_id`           | no       | Bind to thread                   |

## Action: `post_message`

| Key               | Required | Description                 |
| ----------------- | -------- | --------------------------- |
| `channel_id`      | yes      | Destination                 |
| `body_template`   | yes      | Rendered `MessageBody.text` |
| `thread_root_id`  | no       | Thread parent               |
| `blocks_template` | no       | JSON blocks after render    |

## Action: `http.request`

| Key             | Required | Description    |
| --------------- | -------- | -------------- |
| `method`        | yes      | GET, POST, ... |
| `url`           | yes      | HTTPS only     |
| `headers`       | no       | Static headers |
| `body_template` | no       | JSON body      |
| `timeout_ms`    | no       | Max 30000      |

## Action: `delay`

| Key       | Required | Description |
| --------- | -------- | ----------- |
| `seconds` | yes      | 1–604800    |
