# Core concepts

## Workspace

Top-level tenancy boundary. Contains members, channels, agents, automations, retention policies, and search indexes. Identified by `workspace_id` (prefixed `ws_`).

## Member

A human user or service account with RBAC roles. Members can belong to multiple workspaces. OAuth and SSO apply at org level; API keys are workspace-scoped unless marked org-wide.

## Channel

Named conversation space: `public`, `private`, `dm` (exactly two members), or `group_dm` (multi-member private). Channels have optional **topic**, **purpose**, **default_agent_policy** (whether agent posts require approval), **archived_at**, and **retention**. See [feature parity](./05-feature-parity.md) for the full channel/thread/message matrix.

## Thread

A message tree rooted at a **parent message** in a channel. Threads preserve ordering, collapse notifications, and form the primary unit for retrieval chunking.

## Message

Immutable content record with optional edits tracked as revisions. Fields include:

- `body`: Plain text and/or structured blocks (see OpenAPI `MessageBody`).
- `blocks`: Rich layout (sections, actions, context) for clients and agents.
- `attachments`: File references, external URLs, or embedded cards.
- `metadata`: Key-value for app agents (max 8KB).
- `actor_id`: Human member or agent who authored the message.

## Reaction, pin, bookmark

Lightweight indexes on messages for human UX and agent signals (`signal_interest`, priority scoring in retrieval).

## File

Uploaded blob or import from connector. Virus scan status, MIME, size, and **extracted text** for search. Files inherit channel ACLs.

## Custom object types (optional v0.2)

Apps register schemas (e.g. `incident`, `deal`) stored as first-class records linkable from messages.

## Presence and typing

Ephemeral signals over WebSocket or SSE; not durable except for last-seen on members and agents.

## Identifiers

All resources use opaque prefixed IDs (`msg_`, `ch_`, `agt_`, `run_`, etc.) stable across API versions; external systems should never use auto-increment integers.
