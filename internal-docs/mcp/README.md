# Wire MCP server

Package name: `@wire/mcp-server` (spec only).

## Configuration

| Env var              | Required | Description                          |
| -------------------- | -------- | ------------------------------------ |
| `WIRE_API_URL`       | yes      | e.g. `https://api.wire.example/v1`   |
| `WIRE_TOKEN`         | yes*     | Bearer token (*or OAuth device flow) |
| `WIRE_WORKSPACE_ID`  | yes      | Default workspace for tools          |
| `WIRE_MCP_TRANSPORT` | no       | `stdio` (default) or `http`          |

## Security

- Tokens must be least-privilege; prefer MCP delegation tokens over admin keys.
- Log redaction: never print message bodies in debug unless `WIRE_MCP_LOG_CONTENT=1`.
- Enterprise: pin TLS cert fingerprint via `WIRE_TLS_PIN`.

## Parity guarantee

MCP tool JSON schemas are generated from OpenAPI operation `operationId` mappings listed in [mcp.md](./mcp.md). CI diff fails on drift.

## Installation (host examples)

Hosts differ; generic pattern:

1. Add server command: `npx @wire/mcp-server` with env vars.
2. Complete OAuth if no static token.
3. Verify with tool `list_channels`.

Detailed schemas: [tools.md](./tools.md), [resources.md](./resources.md).
