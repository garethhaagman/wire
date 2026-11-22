// @ts-check

/**
 * Allowed method-name patterns per HTTP verb, per internal-docs/api/README.md §3-4
 * (nouns not verbs in URLs; consistent handler naming so the pattern is predictable
 * across every resource). Controllers should read as "list/get/create/update/remove",
 * never "getUsers"/"createUser"-style RPC naming leaking into the handler itself.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
const ALLOWED_NAMES = {
  Get: /^(list|get|getById|find)([A-Z]\w*)?$/,
  Post: /^(create|add|execute|run|reply|approve|reject)([A-Z]\w*)?$/,
  Put: /^(replace|set)([A-Z]\w*)?$/,
  Patch: /^(update|patch)([A-Z]\w*)?$/,
  Delete: /^(remove|delete)([A-Z]\w*)?$/,
};

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Controller handler names must match the REST verb they implement.",
    },
    schema: [],
    messages: {
      mismatch:
        "Handler '{{name}}' is decorated with @{{httpDecorator}}() but its name doesn't match the expected pattern ({{pattern}}). Keep handler names aligned with the HTTP verb so the resource/action mapping stays predictable across controllers.",
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
        const httpDecorator = names.find((name) => name in ALLOWED_NAMES);
        if (!httpDecorator) return;

        const methodName = node.key.type === "Identifier" ? node.key.name : null;
        if (!methodName) return;

        const pattern = ALLOWED_NAMES[httpDecorator];
        if (pattern.test(methodName)) return;

        context.report({
          node,
          messageId: "mismatch",
          data: { name: methodName, httpDecorator, pattern: pattern.source },
        });
      },
    };
  },
};
