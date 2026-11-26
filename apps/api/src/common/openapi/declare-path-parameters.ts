import type { OpenAPIObject } from "@nestjs/swagger";

const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

const PATH_TEMPLATE_PARAM = /\{(?<name>[^}]+)\}/gu;

const DESCRIPTIONS: Record<string, string> = {
  workspaceId:
    "Workspace id (ws_...). List the caller's workspaces with list_workspaces.",
};

/**
 * Declares every `{name}` in a path template that an operation doesn't already
 * declare. @nestjs/swagger only emits path parameters read through `@Param()`;
 * workspace-scoped routes take `workspaceId` through `@CurrentActor()`, which
 * leaves it undeclared. OpenAPI requires every template parameter to be
 * declared, and generated clients (the MCP server in apps/mcp included) cannot
 * call an operation without it.
 */
export const declarePathParameters = (
  document: OpenAPIObject
): OpenAPIObject => {
  for (const [path, item] of Object.entries(document.paths)) {
    const templateParams = [...path.matchAll(PATH_TEMPLATE_PARAM)].flatMap(
      (match) => (match.groups?.name ? [match.groups.name] : [])
    );
    if (templateParams.length === 0) {
      continue;
    }

    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (!operation) {
        continue;
      }

      const declared = new Set(
        (operation.parameters ?? []).flatMap((param) =>
          "in" in param && param.in === "path" ? [param.name] : []
        )
      );
      const missing = templateParams
        .filter((name) => !declared.has(name))
        .map((name) => ({
          name,
          in: "path" as const,
          required: true,
          schema: { type: "string" as const },
          ...(DESCRIPTIONS[name] ? { description: DESCRIPTIONS[name] } : {}),
        }));

      operation.parameters = [...missing, ...(operation.parameters ?? [])];
    }
  }
  return document;
};
