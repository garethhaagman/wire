// @ts-check

const PROPERTY_DECORATOR_NAMES = new Set([
  "ApiProperty",
  "ApiPropertyOptional",
]);

/**
 * Self-documenting keys: any one of these on an @ApiProperty/@ApiPropertyOptional
 * call is enough to give an OpenAPI consumer a concrete, typed value to look at —
 * a literal `example`, a closed `enum`, or a `type` that resolves to something more
 * specific than the bare TS-inferred type (a nested DTO class/array, or an explicit
 * "object" shape with `additionalProperties`). `description` and `nullable` alone
 * don't count — they explain the field but don't show a consumer what a real value
 * looks like, which is the actual gap this rule exists to close (see
 * internal-docs/ui/config-schema.md's UiConfigResourceDto history for the original
 * case: `resolved`/`override` rendered as opaque `type: object` with nothing to
 * generate a client against).
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Every @ApiProperty/@ApiPropertyOptional must carry a concrete example, enum, or typed reference so the generated OpenAPI spec never has an opaque field.",
    },
    schema: [],
    messages: {
      missing:
        '{{decorator}} on \'{{name}}\' has no example, enum, or typed reference (type: () => Dto / [Dto] / "object" with additionalProperties). The generated OpenAPI spec needs one of these so consumers see a real shape, not a bare object/string/number. See the api-design skill\'s "DTO examples" section.',
    },
  },
  create(context) {
    function decoratorCallInfo(decorator) {
      const expr = decorator.expression;
      if (expr.type !== "CallExpression") {
        return null;
      }
      const { callee } = expr;
      const name = callee.type === "Identifier" ? callee.name : null;
      if (!(name && PROPERTY_DECORATOR_NAMES.has(name))) {
        return null;
      }
      return { name, args: expr.arguments };
    }

    function hasOwnKey(objectExpression, key) {
      return objectExpression.properties.some(
        (prop) =>
          prop.type === "Property" &&
          prop.key.type === "Identifier" &&
          prop.key.name === key
      );
    }

    function typeValueIsConcrete(typeValue) {
      // type: () => SomeDto  — arrow function referencing a class
      if (typeValue.type === "ArrowFunctionExpression") {
        return true;
      }
      // type: [SomeDto]      — array-of-DTO shorthand
      if (typeValue.type === "ArrayExpression") {
        return true;
      }
      // type: "object" paired with additionalProperties is checked by the caller;
      // a bare type: String / Number / Boolean / () is NOT concrete on its own —
      // it just restates what TS already infers from the property's own type
      // annotation and tells a reader nothing new about the value.
      return false;
    }

    function hasConcreteTypeProperty(objectExpression) {
      const typeProp = objectExpression.properties.find(
        (prop) =>
          prop.type === "Property" &&
          prop.key.type === "Identifier" &&
          prop.key.name === "type"
      );
      if (typeProp?.type !== "Property") {
        return false;
      }

      if (typeValueIsConcrete(typeProp.value)) {
        return true;
      }

      const isObjectLiteral =
        (typeProp.value.type === "Literal" &&
          typeProp.value.value === "object") ||
        (typeProp.value.type === "Identifier" &&
          typeProp.value.name === "Object");
      return (
        isObjectLiteral && hasOwnKey(objectExpression, "additionalProperties")
      );
    }

    function hasDocumentingKey(objectExpression) {
      if (hasOwnKey(objectExpression, "example")) {
        return true;
      }
      if (hasOwnKey(objectExpression, "enum")) {
        return true;
      }
      if (hasOwnKey(objectExpression, "oneOf")) {
        return true;
      }
      return hasConcreteTypeProperty(objectExpression);
    }

    return {
      PropertyDefinition(node) {
        const decorators = node.decorators ?? [];
        for (const decorator of decorators) {
          const info = decoratorCallInfo(decorator);
          if (!info) {
            continue;
          }

          const name =
            node.key.type === "Identifier" ? node.key.name : "<unknown>";
          const [options] = info.args;

          if (options?.type !== "ObjectExpression") {
            context.report({
              node,
              messageId: "missing",
              data: { decorator: `@${info.name}()`, name },
            });
            continue;
          }

          if (!hasDocumentingKey(options)) {
            context.report({
              node,
              messageId: "missing",
              data: { decorator: `@${info.name}(...)`, name },
            });
          }
        }
      },
    };
  },
};
