// @ts-check

const HTTP_METHOD_DECORATORS = new Set(["Get", "Post", "Put", "Patch", "Delete"]);

/**
 * Every HTTP-method-decorated controller handler must carry either @RequirePermission
 * (the CASL action/subject it needs) or @Public() (explicitly exempt from auth and
 * permission checks, e.g. health checks). A route with neither is a silent security
 * gap — see internal-docs/api/permissions.md and
 * apps/api/src/permissions/permissions.guard.js (which also fails closed at runtime,
 * but this is the fast, pre-merge check).
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Controller handlers must declare @RequirePermission(action, subject) or @Public().",
    },
    schema: [],
    messages: {
      missing:
        "Handler '{{name}}' has @{{httpDecorator}}() but no @RequirePermission(action, subject) or @Public() decorator. Every endpoint must declare what permission it requires — see internal-docs/api/permissions.md.",
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

        if (names.includes("RequirePermission") || names.includes("Public")) return;

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
