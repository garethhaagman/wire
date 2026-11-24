// @ts-check

const DESCRIBING_DECORATORS = new Set([
  "ApiOperation",
  "ApiProperty",
  "ApiPropertyOptional",
  "ApiResponse",
  "ApiOkResponse",
  "ApiCreatedResponse",
  "ApiAcceptedResponse",
  "ApiHeader",
  "ApiQuery",
  "ApiParam",
]);

const EM_DASH = "—";

/**
 * `description` on any Swagger decorator, and the OpenAPI document's own
 * top-level description (`new DocumentBuilder().setDescription(...)` in
 * apps/api/scripts/export-openapi.ts), end up verbatim in the generated
 * OpenAPI spec and from there in SDK-generated doc comments and any
 * doc-rendering tool downstream — an em dash renders inconsistently across
 * those (some fonts/renderers substitute a box or "?"), so OpenAPI-facing
 * prose sticks to plain ASCII punctuation (comma, colon, or a hyphen) instead.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "OpenAPI-facing description strings must not contain an em dash (—).",
    },
    schema: [],
    messages: {
      emDash: "{{source}}'s description contains an em dash (—) — use a comma, colon, or hyphen instead; this text ends up verbatim in the generated OpenAPI spec.",
    },
  },
  create(context) {
    function decoratorName(decorator) {
      const expr = decorator.expression;
      if (expr.type !== "CallExpression") return null;
      const callee = expr.callee;
      return callee.type === "Identifier" ? callee.name : null;
    }

    function stringHasEmDash(node) {
      if (node.type === "Literal" && typeof node.value === "string") return node.value.includes(EM_DASH);
      if (node.type === "TemplateLiteral") return node.quasis.some((q) => q.value.raw.includes(EM_DASH));
      // `"a " + "b" + ...` string concatenation, as used by setDescription(...) calls.
      if (node.type === "BinaryExpression" && node.operator === "+") {
        return stringHasEmDash(node.left) || stringHasEmDash(node.right);
      }
      return false;
    }

    function checkObjectExpression(node, source) {
      const descProp = node.properties.find(
        (prop) => prop.type === "Property" && prop.key.type === "Identifier" && prop.key.name === "description",
      );
      if (!descProp || descProp.type !== "Property") return;

      if (stringHasEmDash(descProp.value)) {
        context.report({ node: descProp.value, messageId: "emDash", data: { source } });
      }
    }

    return {
      Decorator(node) {
        const name = decoratorName(node);
        if (!name || !DESCRIBING_DECORATORS.has(name)) return;

        const expr = node.expression;
        if (expr.type !== "CallExpression") return;
        const options = expr.arguments[0];
        if (options && options.type === "ObjectExpression") {
          checkObjectExpression(options, name);
        }
      },

      // new DocumentBuilder().setDescription("...") — the document's own
      // top-level description, not tied to any one endpoint but still rendered
      // straight into the generated spec.
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;
        if (node.callee.property.type !== "Identifier" || node.callee.property.name !== "setDescription") return;
        const arg = node.arguments[0];
        if (arg && stringHasEmDash(arg)) {
          context.report({ node: arg, messageId: "emDash", data: { source: "setDescription(...)" } });
        }
      },
    };
  },
};
