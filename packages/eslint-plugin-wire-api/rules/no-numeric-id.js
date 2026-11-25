// @ts-check

const ID_NAME_PATTERN = /^(?<idLike>id|.*Id|.*_id)$/u;
const NUMERIC_TYPE_KEYWORDS = new Set(["TSNumberKeyword", "TSBigIntKeyword"]);

/**
 * Identifiers must always be strings, even when every value happens to be digits —
 * see internal-docs/api/numeric-data.md. Flags a class property or interface member
 * whose name looks like an ID (id, fooId, foo_id) but is typed number/bigint, or a
 * class property decorated with @ApiProperty({ type: Number }) / @IsNumber().
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "ID-like fields must be typed/declared as string, never number.",
    },
    schema: [],
    messages: {
      numericIdType:
        "'{{name}}' looks like an identifier but is typed '{{typeName}}'. IDs must always be strings — see internal-docs/api/numeric-data.md.",
      numericIdDecorator:
        "Property '{{name}}' looks like an identifier but is decorated with {{decorator}}, declaring it numeric. IDs must always be strings — see internal-docs/api/numeric-data.md.",
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
      return name ? { name, args: expr.arguments } : null;
    }

    function decoratorDeclaresNumeric(decorator) {
      const info = decoratorCallInfo(decorator);
      if (!info) {
        return false;
      }

      if (info.name === "IsNumber") {
        return true;
      }

      if (info.name === "ApiProperty" || info.name === "ApiPropertyOptional") {
        const [options] = info.args;
        if (options?.type !== "ObjectExpression") {
          return false;
        }
        return options.properties.some((prop) => {
          if (prop.type !== "Property") {
            return false;
          }
          if (prop.key.type !== "Identifier" || prop.key.name !== "type") {
            return false;
          }
          return (
            prop.value.type === "Identifier" && prop.value.name === "Number"
          );
        });
      }

      return false;
    }

    function checkTypeAnnotation(node, name, typeAnnotation) {
      if (!(typeAnnotation && NUMERIC_TYPE_KEYWORDS.has(typeAnnotation.type))) {
        return false;
      }
      context.report({
        node,
        messageId: "numericIdType",
        data: {
          name,
          typeName:
            typeAnnotation.type === "TSBigIntKeyword" ? "bigint" : "number",
        },
      });
      return true;
    }

    return {
      // Class properties (DTOs, TypeORM entities)
      PropertyDefinition(node) {
        if (node.key.type !== "Identifier") {
          return;
        }
        const { name } = node.key;
        if (!ID_NAME_PATTERN.test(name)) {
          return;
        }

        if (
          checkTypeAnnotation(node, name, node.typeAnnotation?.typeAnnotation)
        ) {
          return;
        }

        const decorators = node.decorators ?? [];
        for (const decorator of decorators) {
          if (decoratorDeclaresNumeric(decorator)) {
            const info = decoratorCallInfo(decorator);
            context.report({
              node,
              messageId: "numericIdDecorator",
              data: { name, decorator: `@${info.name}(...)` },
            });
            return;
          }
        }
      },
      // Interface members (@wire/types resource shapes)
      TSPropertySignature(node) {
        if (node.key.type !== "Identifier") {
          return;
        }
        const { name } = node.key;
        if (!ID_NAME_PATTERN.test(name)) {
          return;
        }

        checkTypeAnnotation(node, name, node.typeAnnotation?.typeAnnotation);
      },
    };
  },
};
