# MCP tool schemas

All tools accept optional `_meta.workspace_id` to override the connection default.

## `search_hybrid`

```json
{
  "name": "search_hybrid",
  "description": "Hybrid lexical + semantic search over messages and files. Requires scope search:read.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "channel_ids": { "type": "array", "items": { "type": "string" } },
      "limit": { "type": "integer", "minimum": 1, "maximum": 50, "default": 10 },
      "after": { "type": "string", "format": "date-time" }
    },
    "required": ["query"]
  }
}
```

## `post_message`

```json
{
  "name": "post_message",
  "description": "Post a message to a channel. Requires messages:write and channel access.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "channel_id": { "type": "string" },
      "body": { "type": "string" },
      "thread_root_id": { "type": "string" },
      "metadata": { "type": "object", "additionalProperties": true }
    },
    "required": ["channel_id", "body"]
  }
}
```

## `run_agent`

```json
{
  "name": "run_agent",
  "description": "Start an agent run. Requires agents:invoke.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "agent_id": { "type": "string" },
      "trigger_type": { "type": "string", "enum": ["api", "mcp.tool_call"] },
      "input": {
        "type": "object",
        "properties": {
          "message": { "type": "string" },
          "channel_id": { "type": "string" },
          "thread_root_id": { "type": "string" },
          "context_pack_id": { "type": "string" }
        }
      }
    },
    "required": ["agent_id"]
  }
}
```

## `create_context_pack`

```json
{
  "name": "create_context_pack",
  "description": "Build a citation-backed context pack for harness input.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "source_message_ids": { "type": "array", "items": { "type": "string" } },
      "search_query": { "type": "string" },
      "max_tokens": { "type": "integer", "default": 8000 }
    }
  }
}
```

## `trigger_automation`

```json
{
  "name": "trigger_automation",
  "description": "Manually execute an automation with trigger_type manual.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "automation_id": { "type": "string" },
      "payload": { "type": "object" }
    },
    "required": ["automation_id"]
  }
}
```

Remaining tools mirror list/get operations with minimal arguments; see OpenAPI for field-level validation.
