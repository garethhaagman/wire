// @ts-check

const EM_DASH = "—";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow the em dash (—) anywhere in source: strings, template literals, and comments.",
    },
    schema: [],
    messages: {
      emDash:
        "Avoid the em dash (—); use a comma, colon, parentheses, or a hyphen instead.",
    },
  },
  create(context) {
    function checkText(node) {
      if (
        node.type === "Literal" &&
        typeof node.value === "string" &&
        node.value.includes(EM_DASH)
      ) {
        context.report({ node, messageId: "emDash" });
        return;
      }
      if (node.type === "TemplateLiteral") {
        for (const quasi of node.quasis) {
          if (quasi.value.raw.includes(EM_DASH)) {
            context.report({ node: quasi, messageId: "emDash" });
          }
        }
      }
    }

    return {
      Literal: checkText,
      TemplateElement(node) {
        if (node.value.raw.includes(EM_DASH)) {
          context.report({ node, messageId: "emDash" });
        }
      },
      Program() {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        for (const comment of sourceCode.getAllComments()) {
          if (comment.value.includes(EM_DASH)) {
            context.report({ node: comment, messageId: "emDash" });
          }
        }
      },
    };
  },
};
