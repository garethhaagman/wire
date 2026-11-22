// @ts-check

const BARE_ERROR_CONSTRUCTORS = new Set(["Error", "TypeError", "RangeError"]);

/**
 * Throwing a bare Error/TypeError/RangeError in the API bypasses the status/error-code
 * mapping in apps/api/src/common/filters/api-exception.filter.js — it still gets caught
 * (the filter's @Catch() has no type filter) but always resolves to a generic 500
 * INTERNAL_ERROR, which is almost never what's intended. Throw a NestJS HttpException
 * (NotFoundException, etc.) or @wire's ApiException instead — see
 * internal-docs/api/errors.md.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Throw HttpException/ApiException instead of a bare Error in API code.",
    },
    schema: [],
    messages: {
      bareThrow:
        "Throwing a bare {{ctor}} always maps to a generic 500 INTERNAL_ERROR. Use a NestJS HttpException subclass (NotFoundException, etc.) or ApiException so the response has the correct status and error code.",
    },
  },
  create(context) {
    return {
      ThrowStatement(node) {
        const arg = node.argument;
        if (!arg || arg.type !== "NewExpression") return;
        if (arg.callee.type !== "Identifier") return;
        if (!BARE_ERROR_CONSTRUCTORS.has(arg.callee.name)) return;

        context.report({
          node,
          messageId: "bareThrow",
          data: { ctor: arg.callee.name },
        });
      },
    };
  },
};
