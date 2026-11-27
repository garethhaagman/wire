import { ApiExtension } from "@nestjs/swagger";

/**
 * Keeps an operation in the OpenAPI spec but out of the MCP server's tool list.
 * apps/mcp builds one tool per operation and skips any operation whose
 * `x-wire-mcp.exclude` is true. Use it for routes an agent can't drive through
 * a JSON tool call: streams, raw byte transfers, and multi-step handshakes that
 * need a non-API request in the middle.
 */
export const ExcludeFromMcp = (): MethodDecorator =>
  ApiExtension("x-wire-mcp", { exclude: true });
