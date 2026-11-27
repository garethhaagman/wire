// @ts-check

const CONSOLE_METHODS = new Set([
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "trace",
  "fatal",
]);

/**
 * API request/lifecycle logging is automatic via RequestLoggingMiddleware and
 * the pino Nest logger. Hand-rolled console.* bypasses levels, request_id
 * correlation, and turbo-friendly formatting. Use Nest's Logger (or the shared
 * @wire/observability helpers) instead. See internal-docs/api/observability.md.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow console.* in apps/api — use Nest Logger / @wire/observability.",
    },
    schema: [],
    messages: {
      noConsole:
        "Do not use console.{{method}}() in the API. Request logging is automatic; for domain events use Nest's Logger (backed by @wire/observability). See internal-docs/api/observability.md.",
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/gu, "/");
    // Bootstrap catch and one-shot scripts may run before the logger exists.
    if (filename.endsWith("/src/main.ts") || filename.includes("/scripts/")) {
      return {};
    }

    return {
      MemberExpression(node) {
        if (
          node.object.type !== "Identifier" ||
          node.object.name !== "console"
        ) {
          return;
        }
        if (node.computed || node.property.type !== "Identifier") {
          return;
        }
        if (!CONSOLE_METHODS.has(node.property.name)) {
          return;
        }
        const { parent } = node;
        if (parent?.type !== "CallExpression" || parent.callee !== node) {
          return;
        }
        context.report({
          node,
          messageId: "noConsole",
          data: { method: node.property.name },
        });
      },
    };
  },
};
