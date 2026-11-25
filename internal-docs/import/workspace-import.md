# Workspace import (Slack admin export)

**Slack workspace import is the primary method of user and workspace capture** for Wire. Greenfield signup (empty workspace + invites) remains supported but is secondary. The expected onboarding path:

1. Org admin authenticates (OAuth).
2. Admin uploads a **Slack workspace export** (zip from Slack admin settings).
3. Wire provisions organization, workspace, **members**, channels, and **backdated** history.
4. Users **claim** imported identities on first login (email match or invite link).

Imports are **async jobs** with validation, dry-run, progress, error reports, and idempotent re-runs.

---

## Supported sources (v0.1)

| `source_format`                      | Description                                                          |
| ------------------------------------ | -------------------------------------------------------------------- |
| `slack_workspace_export_zip`         | Standard **Export workspace data** zip (JSON). **Primary.**          |
| `slack_enterprise_compliance_export` | Enterprise Grid compliance / eDiscovery bulk JSON. **Planned** v0.2. |

Normative field mapping for the zip layout: [import/slack-admin-export.md](../import/slack-admin-export.md).

---

## Backdating and temporal fidelity

All imported content preserves **original timestamps** from the export. Wire never rewrites history to “now” at import time.

| Wire field          | Semantics                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `source_created_at` | Timestamp from source (`ts`, `created`, file mtime). **Authoritative for ordering and search.** |
| `created_at`        | Equals `source_created_at` for imported rows (not wall-clock import time).                      |
| `imported_at`       | When Wire ingested the row (audit only).                                                        |
| `source_edited_at`  | From Slack `edited.ts` when present.                                                            |

Rules:

- Channel lists, search, and exports sort by `source_created_at` unless `sort=ingestion` is requested for debugging.
- **No live webhooks** for imported bulk: job runs with `suppress_events: true`; a single `import.completed` webhook fires when done.
- Automations do not evaluate historical messages during import (cursor starts at job completion time unless admin opts in).
- Agent retrieval indexes historical text immediately after import with correct temporal metadata.

Slack `ts` strings (e.g. `1363085255.000176`) map to RFC3339 UTC with microsecond precision preserved where possible.

---

## User capture and identity

### Member provisioning

From `users.json` (and bot users where configured):

| Slack field          | Wire                                                    |
| -------------------- | ------------------------------------------------------- |
| `id`                 | `ExternalMapping.source_id` → `member_id`               |
| `profile.email`      | `Member.email` (normalized)                             |
| `name` / `real_name` | `display_name`, optional `handle`                       |
| `is_bot`             | `Member` with `member_kind: bot` or map to `Agent` stub |
| `deleted`            | `Member.status: deactivated` (retain messages)          |

**Claim flow**

- Imported humans start as `claim_status: unclaimed`.
- On SSO/login, match email → attach auth identity → `claim_status: claimed`.
- Admin may send claim links via `POST /imports/{id}/send-claim-invites`.
- Duplicate emails merge under admin confirmation (`merge_policy`).

### Why import-first

- Captures **full roster** without per-user invites.
- Preserves **DM membership** and private channel ACLs from export `members` arrays.
- Enables **day-one search** over real history for agents.

---

## Import pipeline (phases)

```text
upload → validate → plan → ingest → reconcile → index → complete
```

| Phase               | Actions                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| **validate**        | Zip structure, JSON schema, size caps, malware scan                           |
| **plan**            | Count users/channels/messages; estimate duration; detect unsupported features |
| **ingest users**    | Members, bots, external mappings                                              |
| **ingest channels** | public/private/archive state; topics; purposes                                |
| **ingest messages** | Per-channel JSON; threads via `thread_ts`; reactions; files                   |
| **ingest dms**      | `dms.json` + dm conversation folders                                          |
| **reconcile**       | Permalinks, @mentions via mapping table, thread parent links                  |
| **index**           | Search chunks with `source_created_at`; optional defer embed batch            |

Re-import: same `source_workspace_key` (Slack team id) with `mode: merge` or `replace_history` (admin-only).

---

## API surface (summary)

| Endpoint                       | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `POST /import-uploads`         | Multipart or signed URL for export zip              |
| `POST /imports`                | Start job (`upload_id`, `source_format`, `options`) |
| `GET /imports/{id}`            | Status, progress, errors                            |
| `POST /imports/{id}/validate`  | Dry-run only                                        |
| `POST /workspaces/from-import` | **Primary provision**: org + workspace + import job |
| `GET /imports/{id}/report`     | CSV/JSON of failures and warnings                   |
| `GET /imports/{id}/mappings`   | Slack id → Wire id map (admin)                      |

OpenAPI is canonical; scopes: `admin:workspace`, `imports:write`, `imports:read`.

---

## Options (`ImportOptions`)

| Option                     | Default | Description                                                  |
| -------------------------- | ------- | ------------------------------------------------------------ |
| `backdate_timestamps`      | `true`  | Must stay true for Slack export; disables only for tests     |
| `import_files`             | `true`  | Download file URLs from export metadata when still available |
| `import_dms`               | `true`  | Include IM/mpim                                              |
| `import_private_channels`  | `true`  | Requires complete export                                     |
| `map_bots_to_agents`       | `false` | Create agent stubs for bot users                             |
| `suppress_events`          | `true`  | No per-message webhooks during ingest                        |
| `create_unclaimed_members` | `true`  | Primary user capture                                         |

---

## Security and compliance

- Export zips may contain secrets; treat uploads as **confidential**, encrypt at rest, TTL delete raw zip after successful ingest (configurable retention for failed jobs).
- Only **workspace admins** (or org owners) may start imports.
- Audit: `import.started`, `import.completed`, actor, byte size, source team id hash.
- Legal hold on workspace blocks `replace_history` re-import.

---

## Limitations (v0.1)

| Slack artifact                 | Wire v0.1                                           |
| ------------------------------ | --------------------------------------------------- |
| Huddles / clips                | Skipped (logged in report)                          |
| Canvas                         | Links preserved; body **planned** v0.2              |
| Workflow messages              | Imported as messages; workflow re-creation N/A      |
| Live Connect / shared channels | Not in standard export; **planned** enterprise path |
| Message threads > export depth | All JSON files in export are processed              |

---

## Parity and onboarding UX (non-normative)

Admin UI copy should lead with **“Import from Slack export”**; empty workspace is “Start fresh”. Agents and MCP attach after import completes so retrieval spans full backdated history.
