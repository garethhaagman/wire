# Team messaging feature parity

This section maps **mainstream team chat** capabilities—the set users expect from category-leading products—to Wire’s API and docs. Wire adds AI-native surfaces (agents, harnesses, context packs, MCP); parity here means **humans can migrate workflows without losing primitives**.

**Legend**

| Status | Meaning |
|--------|---------|
| **Shipped (spec)** | Defined in OpenAPI and/or normative docs |
| **Partial** | Modeled in docs or events only; API incomplete |
| **Planned** | Committed for v0.2+ in this spec |
| **Wire+** | Superset beyond mainstream (called out explicitly) |
| **Out of scope** | Intentional omission for v0.1 |

---

## Channels and conversation topology

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Public channels** | Open join, visible directory | `ChannelType: public`, `GET/POST /channels` | **Shipped (spec)** |
| **Private channels** | Invite-only, hidden from directory | `ChannelType: private`, membership APIs | **Shipped (spec)** |
| **Direct messages (1:1)** | Private two-person room | `ChannelType: dm` | **Shipped (spec)** |
| **Group direct messages** | Multi-person private room | `ChannelType: group_dm` with `member_ids` | **Shipped (spec)** |
| **Channel topic & purpose** | Short metadata in header | `topic`, `purpose` on channel | **Shipped (spec)** |
| **Create / rename / archive** | Lifecycle management | `POST/PATCH /channels`, `POST .../archive` | **Shipped (spec)** |
| **Channel membership** | Add/remove, list members | `/channels/{id}/members` | **Shipped (spec)** |
| **Shared / external channels** | Cross-org collab | Federated workspace links | **Planned** (v0.3) |
| **Starred / favorited channels** | Per-user shortcuts | `GET/PATCH /members/me/preferences` | **Shipped (spec)** |
| **Sections / sidebar grouping** | Organize channels | `channel_section` in preferences | **Planned** (v0.2) |
| **Default channels on join** | Auto-join set | Workspace policy + `default_channel_ids` | **Planned** (v0.2) |

---

## Threads

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Reply in thread** | Side conversation on one message | `POST /threads/{thread_root_id}/messages` | **Shipped (spec)** |
| **Thread broadcast** | Also send reply to channel | `broadcast_to_channel` on reply | **Shipped (spec)** |
| **Thread participant list** | Who’s in the thread | Derived from `listThreadMessages` actors | **Shipped (spec)** |
| **“Also send to channel”** | Checkbox on reply | `MessageCreate.broadcast_to_channel` | **Shipped (spec)** |
| **Unread in thread** | Per-user read cursor | `POST /threads/{id}/mark-read` | **Shipped (spec)** |
| **Thread-centric search** | Find within thread | `SearchHybridRequest.thread_root_id` | **Shipped (spec)** |
| **Wire+ thread context packs** | Agent snapshot of thread | `POST /context-packs` with thread id | **Wire+** |

---

## Messages and composition

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Post message** | Text + attachments | `POST /channels/{id}/messages` | **Shipped (spec)** |
| **Edit message** | Revision history | `PATCH /messages/{id}`, `revision` field | **Shipped (spec)** |
| **Delete message** | Tombstone / compliance | `DELETE /messages/{id}` | **Shipped (spec)** |
| **Rich formatting** | mrkdwn-like, lists, code | `MessageBody` + `blocks` | **Shipped (spec)** |
| **Link unfurling** | Preview cards | `metadata.unfurl` + event `link.shared` | **Planned** (v0.2) |
| **Scheduled send** | Post at future time | `scheduled_at` on create (field present; worker v0.2) | **Partial** |
| **Message permalinks** | Stable URLs | `citation_uri` / `permalink` | **Shipped (spec)** |
| **Ephemeral messages** | Only visible to one user | `visibility: ephemeral` + `ephemeral_user_id` | **Shipped (spec)** |
| **Interactive actions** | Buttons, select menus | `blocks` type `actions` | **Shipped (spec)** |

---

## Mentions and notifications

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **@member** | Notify user | Parse + `notification_targets` | **Shipped (spec)** |
| **@agent** | Notify / invoke agent | Mention resolution → agent run policy | **Shipped (spec)** |
| **@channel / @here** | Notify many | Scoped mentions with rate limits | **Shipped (spec)** |
| **User groups / teams** | `@oncall` alias | `UserGroup` + expand on send | **Planned** (v0.2) |
| **Notification preferences** | Per-channel mute, keywords | `muted_channel_ids` in `/members/me/preferences` | **Partial** |
| **Mobile push** | APNS/FCM | Outbound via connector | **Out of scope** (v0.1 impl) |

---

## Reactions, pins, bookmarks

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Emoji reactions** | Add/remove, counts | `POST/DELETE /messages/{id}/reactions` | **Shipped (spec)** |
| **Custom emoji** | Workspace emoji upload | `/emoji` | **Planned** (v0.2) |
| **Pin message** | Highlight in channel | `POST/DELETE /channels/{id}/pins` | **Shipped (spec)** |
| **List pins** | Pinned items in channel | `GET /channels/{id}/pins` | **Shipped (spec)** |
| **Save for later / bookmark** | Personal list | `POST/GET/DELETE /bookmarks` | **Shipped (spec)** |
| **Agent reaction signals** | Automations on emoji | Event `reaction.added` | **Shipped (spec)** |

---

## Files and media

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Upload & share** | Drag-drop in channel | `POST /files`, attach to message | **Shipped (spec)** |
| **File comments** | Thread on file | File as thread root (same thread model) | **Shipped (spec)** |
| **Search file contents** | Index text/PDF | Retrieval pipeline + `include_files` | **Shipped (spec)** |
| **Snippets** | Short code clips | `File` with `type: snippet` | **Planned** (v0.2) |

---

## Search and history

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Keyword search** | `q=` across workspace | `GET /search` | **Shipped (spec)** |
| **Filters** | From, in, date, has:file | Hybrid search filters | **Shipped (spec)** |
| **Semantic search** | NL queries | `POST /search/hybrid` | **Wire+** (parity+) |
| **Export / compliance** | History export | `POST /workspaces/{id}/exports` | **Planned** (v0.2) |

---

## Members, identity, and access

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Invite by email** | Grow workspace | `POST /invites` | **Shipped (spec)** |
| **Guest accounts** | Limited access | RBAC role `guest` | **Shipped (spec)** |
| **Profiles & avatars** | Display identity | `GET/PATCH /members/{id}` | **Shipped (spec)** |
| **Presence & status** | Available, emoji status | SSE `presence` + `Member.status` | **Partial** |
| **SSO / SAML** | Enterprise login | Org-level OIDC/SAML | **Shipped (spec)** (docs) |
| **2FA** | Account security | Org policy | **Planned** (impl) |

---

## Integrations, commands, and apps

| Feature | Mainstream expectation | Wire mapping | Status |
|---------|------------------------|--------------|--------|
| **Bot users** | Automated posters | **Agents** + service accounts | **Wire+** |
| **Incoming webhooks** | Post from outside | Webhook endpoints + automations | **Shipped (spec)** |
| **Outgoing events** | Subscribe to activity | Webhooks + SSE | **Shipped (spec)** |
| **Slash commands** | `/command` in composer | `POST /commands` dispatch | **Shipped (spec)** |
| **Workflow automation** | If-this-then-that in product | **Automations** resource | **Wire+** |
| **App home / modals** | Structured UI | `blocks` + future `views` API | **Partial** |
| **MCP** | — | First-class MCP server | **Wire+** |

---

## Calls, canvas, and secondary surfaces

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Voice / video (huddles)** | Instant calls | RTC session API | **Out of scope** v0.1 |
| **Canvas / doc co-editing** | Embedded docs | Link + `custom object` v0.2 | **Planned** |
| **Lists / project tables** | Structured tasks in product | Connector to external PM | **Out of scope** |

---

## Migration and capture

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Import admin export** | Bring your history | `POST /workspaces/from-import` | **Shipped (spec)** |
| **Backdated messages** | Preserve original times | `source_created_at` / `backdate_timestamps` | **Shipped (spec)** |
| **User roster from export** | Not manual invite-only | Unclaimed members + claim flow | **Shipped (spec)** |
| **Re-import / merge** | Update after new export | `ImportOptions.mode` | **Shipped (spec)** |
| **Enterprise compliance export** | Grid eDiscovery | `slack_enterprise_compliance_export` | **Planned** (v0.2) |

---

## Enterprise and admin

| Feature | Mainstream expectation | Wire | Status |
|---------|------------------------|------|--------|
| **Audit log** | Admin visibility | `GET /audit-events` | **Shipped (spec)** |
| **Retention / legal hold** | Policy + e-discovery | Workspace policies, hold flags | **Partial** |
| **Data residency** | Region pinning | `data_region` | **Shipped (spec)** |
| **Org-wide search** | Multi-workspace (Grid-like) | Organization aggregate API | **Planned** (v0.3) |
| **DLP** | Redaction rules | Retrieval redaction profiles | **Shipped (spec)** (docs) |

---

## Parity summary

| Area | v0.1 spec coverage |
|------|-------------------|
| **Public / private / DM / group DM channels** | Full |
| **Threads** (reply, broadcast, read state) | Full |
| **Messages** (CRUD, blocks, ephemeral) | Full |
| **Reactions, pins, bookmarks** | Full (OpenAPI) |
| **Files & search** | Full |
| **Members, invites, guests** | Full |
| **Webhooks, automations, agents** | Wire superset |
| **Calls, canvas, lists** | Not v0.1 |

Gaps to close before calling **implementation parity** with mainstream chat (not API-only): notification delivery channels, link unfurl workers, custom emoji CDN, and optional RTC.

---

## Traceability

Each **Shipped (spec)** row should map to an OpenAPI `operationId` or schema. CI check `scripts/parity-check` (future) validates the matrix against `openapi.yaml` extensions `x-wire-parity-id`.