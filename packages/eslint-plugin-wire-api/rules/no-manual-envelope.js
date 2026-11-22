// @ts-check

const ENVELOPE_KEYS = new Set(["success", "data", "error", "meta"]);

/**
 * Controllers/services must never hand-build the {success, data, error, meta}
 * envelope — that's the job of ResponseEnvelopeInterceptor and ApiExceptionFilter
 * alone (internal-docs/api/README.md § 13: build conventions into the framework,
 * not into every handler). A handler returning an object shaped like the envelope
 * gets double-wrapped by the interceptor, corrupting the response.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Controllers/services must return plain data, not a hand-built {success, data, error, meta} envelope.",
    },
    schema: [],
    messages: {
      manualEnvelope:
        "This object literal has the shape of the response envelope (success/data/error/meta). Return plain data instead — ResponseEnvelopeInterceptor wraps every response automatically.",
    },
  },
  create(context) {
    return {
      ObjectExpression(node) {
        const keys = node.properties
          .map((prop) => (prop.type === "Property" && prop.key.type === "Identifier" ? prop.key.name : null))
          .filter(Boolean);

        if (keys.length < 3) return;
        const matchCount = keys.filter((key) => ENVELOPE_KEYS.has(key)).length;
        if (matchCount < 3) return;

        context.report({ node, messageId: "manualEnvelope" });
      },
    };
  },
};
