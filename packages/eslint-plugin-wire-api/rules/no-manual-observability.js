// @ts-check

const HTTP_METHOD_DECORATORS = new Set([
  "Get",
  "Post",
  "Put",
  "Patch",
  "Delete",
]);

const BANNED_INTERCEPTOR_NAMES = new Set([
  "RequestLoggingInterceptor",
  "RequestLoggingMiddleware",
  "TracingInterceptor",
  "LoggingInterceptor",
  "HttpLoggingInterceptor",
]);

const BANNED_IMPORT_SOURCES = new Set([
  "@opentelemetry/sdk-node",
  "@opentelemetry/sdk-trace-node",
  "@opentelemetry/auto-instrumentations-node",
  "@opentelemetry/exporter-trace-otlp-http",
  "@opentelemetry/exporter-trace-otlp-grpc",
]);

/**
 * HTTP access logs and OpenTelemetry spans are wired once in create-app /
 * main bootstrap. Controllers must not re-attach logging/tracing interceptors
 * or start their own OTEL SDK — that duplicates spans and drifts from the
 * shared pipeline. Domain code may still use Nest Logger and
 * `@wire/observability`'s `trace` helpers for rare custom spans.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow per-route logging/tracing interceptors and DIY OTEL SDK setup in apps/api.",
    },
    schema: [],
    messages: {
      manualInterceptor:
        "Do not attach {{name}} on a controller/handler — request logging and OTEL are registered globally in create-app.ts. See internal-docs/api/observability.md.",
      diySdk:
        "Do not import {{source}} from apps/api — start OpenTelemetry only via @wire/observability in main.ts. See internal-docs/api/observability.md.",
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/gu, "/");
    const isBootstrap =
      filename.endsWith("/src/main.ts") ||
      filename.endsWith("/src/instrumentation.ts") ||
      filename.endsWith("/src/create-app.ts") ||
      filename.includes("/common/middleware/request-logging.middleware.ts") ||
      filename.includes("/common/filters/api-exception.filter.ts");

    function decoratorName(decorator) {
      const expr = decorator.expression;
      const callee = expr.type === "CallExpression" ? expr.callee : expr;
      return callee.type === "Identifier" ? callee.name : null;
    }

    function reportBannedInterceptor(node) {
      if (
        node.type === "Identifier" &&
        BANNED_INTERCEPTOR_NAMES.has(node.name)
      ) {
        context.report({
          node,
          messageId: "manualInterceptor",
          data: { name: node.name },
        });
        return;
      }
      if (node.type === "ArrayExpression") {
        for (const el of node.elements) {
          if (el) {
            reportBannedInterceptor(el);
          }
        }
      }
    }

    return {
      ImportDeclaration(node) {
        if (isBootstrap) {
          return;
        }
        const source = node.source.value;
        if (typeof source !== "string") {
          return;
        }
        if (
          BANNED_IMPORT_SOURCES.has(source) ||
          source.startsWith("@opentelemetry/sdk-") ||
          source.startsWith("@opentelemetry/exporter-")
        ) {
          context.report({
            node,
            messageId: "diySdk",
            data: { source },
          });
        }
      },

      MethodDefinition(node) {
        if (isBootstrap) {
          return;
        }
        const decorators = node.decorators ?? [];
        const names = decorators.map(decoratorName).filter(Boolean);
        const isHttp = names.some((name) => HTTP_METHOD_DECORATORS.has(name));
        if (
          !isHttp &&
          node.key.type === "Identifier" &&
          node.key.name !== "constructor"
        ) {
          // Still check UseInterceptors on non-HTTP methods / class-level below.
        }

        for (const decorator of decorators) {
          const expr = decorator.expression;
          if (expr.type !== "CallExpression") {
            continue;
          }
          const { callee } = expr;
          const name = callee.type === "Identifier" ? callee.name : null;
          if (name !== "UseInterceptors") {
            continue;
          }
          for (const arg of expr.arguments) {
            reportBannedInterceptor(arg);
          }
        }
      },

      ClassDeclaration(node) {
        if (isBootstrap) {
          return;
        }
        for (const decorator of node.decorators ?? []) {
          const expr = decorator.expression;
          if (expr.type !== "CallExpression") {
            continue;
          }
          const { callee } = expr;
          if (
            callee.type !== "Identifier" ||
            callee.name !== "UseInterceptors"
          ) {
            continue;
          }
          for (const arg of expr.arguments) {
            reportBannedInterceptor(arg);
          }
        }
      },
    };
  },
};
