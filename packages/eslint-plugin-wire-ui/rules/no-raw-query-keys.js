// @ts-check

/**
 * Query keys are a shared contract between fetches, mutations, route loaders,
 * and realtime invalidation. Inline arrays make that contract easy to drift.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "TanStack Query keys must come from the shared queryKeys factory.",
    },
    schema: [],
    messages: {
      rawQueryKey:
        "Use a queryKeys factory entry instead of an inline query key array.",
    },
  },
  create(context) {
    return {
      Property(node) {
        const isQueryKey =
          (node.key.type === "Identifier" && node.key.name === "queryKey") ||
          (node.key.type === "Literal" && node.key.value === "queryKey");
        if (isQueryKey && node.value.type === "ArrayExpression") {
          context.report({ node: node.value, messageId: "rawQueryKey" });
        }
      },
    };
  },
};
