// @ts-check

const HTTP_METHOD_DECORATORS = new Set(["Get", "Post", "Put", "Patch", "Delete"]);
const RESPONSE_DECORATOR_PATTERN = /^Api(Ok|Created|Accepted|NoContent|Response)/;

/**
 * Every HTTP-method-decorated controller handler must also carry at least one
 * @Api*Response decorator (@ApiOkResponse, @ApiCreatedResponse, @ApiResponse, ...)
 * so the generated OpenAPI spec (apps/api/scripts/export-openapi.ts) never has an
 * undocumented response shape — see internal-docs/api/README.md § OpenAPI as source
 * of truth.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Controller handlers must declare an @Api*Response decorator for OpenAPI generation.",
    },
    schema: [],
    messages: {
      missing:
        "Handler '{{name}}' has @{{httpDecorator}}() but no @ApiOkResponse/@ApiCreatedResponse/@ApiResponse decorator. The generated OpenAPI spec needs this to document the response shape.",
    },
  },
  create(context) {
    function decoratorName(decorator) {
      const expr = decorator.expression;
      const callee = expr.type === "CallExpression" ? expr.callee : expr;
      return callee.type === "Identifier" ? callee.name : null;
    }

    return {
      MethodDefinition(node) {
        const decorators = node.decorators ?? [];
        const names = decorators.map(decoratorName).filter(Boolean);

        const httpDecorator = names.find((name) => HTTP_METHOD_DECORATORS.has(name));
        if (!httpDecorator) return;

        const hasResponseDecorator = names.some((name) => RESPONSE_DECORATOR_PATTERN.test(name));
        if (hasResponseDecorator) return;

        const methodName = node.key.type === "Identifier" ? node.key.name : "<unknown>";
        context.report({
          node,
          messageId: "missing",
          data: { name: methodName, httpDecorator },
        });
      },
    };
  },
};
