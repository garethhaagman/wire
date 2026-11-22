# Model Context Protocol (MCP)

## Role

The **Wire MCP server** is a thin, typed adapter over the same REST API defined in `api/openapi.yaml`. MCP hosts (Claude Desktop, Cursor, custom runners) discover tools, resources, and prompts without learning Wire-specific HTTP details.

## Deployment modes

| Mode | Auth | Typical use |
|------|------|-------------|
| `stdio` | Local OAuth device flow or env `WIRE_TOKEN` | Developer machine |
| `streamable-http` | Bearer token per connection | Shared team gateway |
| `sidecar` | mTLS to Wire API gateway | Enterprise |

## Server metadata

```json
{
  "name": "io.wire.mcp",
  "title": "Wire",
  "version": "0.1.0",
  "protocolVersion": "2025-03-26"
}
```

## Tools (canonical set)

| Tool | Maps to API |
|------|-------------|
| `list_channels` | `GET /v1/channels` |
| `get_channel_history` | `GET /v1/channels/{id}/messages` |
| `post_message` | `POST /v1/channels/{id}/messages` |
| `reply_in_thread` | `POST /v1/threads/{id}/messages` |
| `search_hybrid` | `POST /v1/search/hybrid` |
| `create_context_pack` | `POST /v1/context-packs` |
| `list_agents` | `GET /v1/agents` |
| `run_agent` | `POST /v1/agent-runs` |
| `get_agent_run` | `GET /v1/agent-runs/{id}` |
| `list_automations` | `GET /v1/automations` |
| `trigger_automation` | `POST /v1/automations/{id}/execute` |

Tool descriptions embed **required scopes** (e.g. `messages:write`, `agents:invoke`).

## Resources

| URI template | Content |
|--------------|---------|
| `wire://workspace/{ws_id}` | Workspace summary JSON |
| `wire://channel/{ch_id}` | Channel metadata + recent 20 messages |
| `wire://message/{msg_id}` | Full message + thread head |
| `wire://agent/{agt_id}` | Agent config (secrets redacted) |
| `wire://context-pack/{ctx_id}` | Pack for prompt injection |

Resources refresh on subscription when webhooks are configured; otherwise ETag polling.

## Prompts

| Prompt | Purpose |
|--------|---------|
| `wire_summarize_thread` | Args: `thread_id`, optional tone |
| `wire_draft_reply` | Args: `message_id`, constraints |
| `wire_triage_channel` | Args: `channel_id`, since timestamp |

Prompts fetch live data via tools internally; hosts may override model.

## Authorization

MCP connections carry a **delegation token** minted from:

1. User OAuth (acts as member + optional agent delegation).
2. Agent-only token (scoped to agent permissions).
3. Automation runtime token (single automation id).

Token exchange: `POST /v1/oauth/mcp-token` with PKCE.

## Error mapping

HTTP status → MCP `isError` with structured `wire_error_code` (see OpenAPI `Error`).

## Rate limits

MCP shares workspace rate limits; tool responses include `X-RateLimit-Remaining`.

See [mcp/tools.md](../mcp/tools.md) and [mcp/resources.md](../mcp/resources.md) for JSON schemas.