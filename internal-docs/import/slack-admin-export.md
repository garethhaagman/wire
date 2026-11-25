# Slack workspace export → Wire mapping

Source: Slack **Settings → Import/Export Data → Export** (JSON zip). Wire expects the standard layout.

## Zip layout

```text
export.zip
├── users.json
├── channels.json
├── dms.json                    # may be absent in older exports
├── groups.json                 # private channels (legacy name)
├── mpims.json                  # group DMs
├── integrations.json           # optional
└── {channel-name}/             # one folder per channel
    ├── YYYY-MM-DD.json
    └── ...
```

DM conversations may appear under folders named with member ids (e.g. `D01234567/`).

## `users.json`

| Slack                                        | Wire                                           |
| -------------------------------------------- | ---------------------------------------------- |
| `id` (e.g. `U0123`)                          | `ExternalMapping` `source: slack`, `source_id` |
| `profile.email`                              | `Member.email`                                 |
| `profile.real_name` / `profile.display_name` | `Member.display_name`                          |
| `name`                                       | suggested `handle` (dedupe)                    |
| `is_bot`                                     | `member_kind: bot` or `Agent` stub             |
| `is_restricted`                              | `role: guest`                                  |
| `deleted`                                    | `status: deactivated`                          |

## `channels.json` / `groups.json`

| Slack                         | Wire                                     |
| ----------------------------- | ---------------------------------------- |
| `id`                          | mapping → `ch_`                          |
| `name`                        | `Channel.name`                           |
| `is_private` / in groups.json | `type: private`                          |
| `is_archived`                 | `archived_at` from export or import time |
| `topic.value`                 | `topic`                                  |
| `purpose.value`               | `purpose`                                |
| `members[]`                   | channel membership after users ingest    |
| `created`                     | channel `source_created_at`              |

## Messages (`YYYY-MM-DD.json` arrays)

| Slack                 | Wire                                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| `ts`                  | `source_created_at`, `created_at` (backdated)                             |
| `user`                | `actor_id` via user mapping                                               |
| `text`                | `body.text` (mrkdwn preserved in metadata)                                |
| `thread_ts`           | If `ts != thread_ts`, set `thread_root_id` from parent mapping            |
| `reply_count`         | informational; thread built from messages                                 |
| `reactions[]`         | `ReactionSummary` per message                                             |
| `files[]`             | `File` import job; attach to message                                      |
| `edited.ts`           | `source_edited_at`, increment `revision`                                  |
| `subtype`             | Store in `metadata.slack_subtype`; system messages → `actor_type: system` |
| `bot_id` / `username` | Link bot mapping; optional agent attribution                              |

**Ordering:** Process files in lexicographic date order; within file, sort by `ts` ascending.

## `dms.json` / DM folders

| Slack           | Wire                             |
| --------------- | -------------------------------- |
| Conversation id | `Channel.type: dm` or `group_dm` |
| Member set      | `member_ids` on channel          |
| Messages        | Same as channel JSON             |

## Team / workspace identity

Slack export does not always include team id at root; Wire extracts from:

1. `integrations.json` / `url` host metadata if present
2. Admin-supplied `source_workspace_key` on import (required): Slack team id or export label hash

Used for re-import idempotency.

## Permalinks

Generate `permalink` and `citation_uri` using Wire ids after mapping; store original `slack://` or archive link in `metadata.source_permalink` when reconstructable.

## Validation errors (examples)

| Code                           | Cause                                             |
| ------------------------------ | ------------------------------------------------- |
| `import.missing_users_json`    | Invalid zip                                       |
| `import.orphan_message_user`   | User not in users.json                            |
| `import.thread_parent_missing` | Parent ts not yet ingested (retry reconcile pass) |
| `import.file_url_expired`      | Slack file URL 403; row in report                 |
