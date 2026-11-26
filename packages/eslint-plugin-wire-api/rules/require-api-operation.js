// @ts-check

const HTTP_METHOD_DECORATORS = new Set([
  "Get",
  "Post",
  "Put",
  "Patch",
  "Delete",
]);
const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;

/**
 * Every HTTP-method-decorated controller handler must carry
 * `@ApiOperation({ operationId: "verb_noun", summary: "..." })`. The operationId
 * becomes the MCP tool name (apps/mcp serves one tool per OpenAPI operation) and
 * the SDK method name, so it has to be a stable, readable snake_case identifier
 * rather than Nest's default `ControllerName_method`. The summary becomes the
 * tool description an agent reads to decide whether to call it.
 *
 * Handlers hidden from the spec with @ApiExcludeEndpoint() are exempt.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Controller handlers must declare @ApiOperation with a snake_case operationId and a summary.",
    },
    schema: [],
    messages: {
      missing:
        "Handler '{{name}}' has @{{httpDecorator}}() but no @ApiOperation({ operationId, summary }). The operationId names the MCP tool and SDK method generated from the OpenAPI spec.",
      missingOperationId:
        "@ApiOperation on '{{name}}' needs a string-literal operationId (snake_case, e.g. 'list_channels').",
      badOperationId:
        "operationId '{{operationId}}' on '{{name}}' must be snake_case (e.g. 'list_channels').",
      missingSummary:
        "@ApiOperation on '{{name}}' needs a non-empty string-literal summary; it becomes the MCP tool description.",
    },
  },
  create(context) {
    function decoratorName(decorator) {
      const expr = decorator.expression;
      const callee = expr.type === "CallExpression" ? expr.callee : expr;
      return callee.type === "Identifier" ? callee.name : null;
    }

    function stringProperty(objectExpression, key) {
      const property = objectExpression.properties.find(
        (p) =>
          p.type === "Property" &&
          p.key.type === "Identifier" &&
          p.key.name === key
      );
      if (
        property?.type === "Property" &&
        property.value.type === "Literal" &&
        typeof property.value.value === "string"
      ) {
        return property.value.value;
      }
      return null;
    }

    return {
      MethodDefinition(node) {
        const decorators = node.decorators ?? [];
        const names = decorators.map(decoratorName);

        const httpDecorator = names.find(
          (name) => name !== null && HTTP_METHOD_DECORATORS.has(name)
        );
        if (!httpDecorator || names.includes("ApiExcludeEndpoint")) {
          return;
        }

        const methodName =
          node.key.type === "Identifier" ? node.key.name : "<unknown>";
        const operation = decorators.find(
          (d) => decoratorName(d) === "ApiOperation"
        );
        if (!operation) {
          context.report({
            node,
            messageId: "missing",
            data: { name: methodName, httpDecorator },
          });
          return;
        }

        const expr = operation.expression;
        const options =
          expr.type === "CallExpression" &&
          expr.arguments[0]?.type === "ObjectExpression"
            ? expr.arguments[0]
            : null;

        const operationId = options && stringProperty(options, "operationId");
        if (!operationId) {
          context.report({
            node: operation,
            messageId: "missingOperationId",
            data: { name: methodName },
          });
        } else if (!SNAKE_CASE.test(operationId)) {
          context.report({
            node: operation,
            messageId: "badOperationId",
            data: { name: methodName, operationId },
          });
        }

        const summary = options && stringProperty(options, "summary");
        if (!summary?.trim()) {
          context.report({
            node: operation,
            messageId: "missingSummary",
            data: { name: methodName },
          });
        }
      },
    };
  },
};
