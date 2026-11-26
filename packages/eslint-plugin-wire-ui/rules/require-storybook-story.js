// @ts-check
import { existsSync } from "node:fs";

function returnsJsx(node) {
  if (!node) {
    return false;
  }
  if (node.type === "JSXElement" || node.type === "JSXFragment") {
    return true;
  }
  if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration"
  ) {
    const { body } = node;
    if (body?.type === "BlockStatement") {
      return body.body.some(
        (stmt) => stmt.type === "ReturnStatement" && returnsJsx(stmt.argument)
      );
    }
    return returnsJsx(body);
  }
  if (node.type === "ConditionalExpression") {
    return returnsJsx(node.consequent) || returnsJsx(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return returnsJsx(node.left) || returnsJsx(node.right);
  }
  if (node.type === "CallExpression") {
    return node.arguments.some((arg) => returnsJsx(arg));
  }
  return false;
}

const STORY_SOURCE_PATH = /^(?<base>.*)\.tsx$/u;

/**
 * Every component exported from @wire/ui needs a Storybook story so a
 * reviewer, or an agent using the ui-component-creator skill, can see every
 * variant/permutation of a primitive rendered against baseUiConfig without
 * reading its source. Checked by file existence, not content: a `<name>.tsx`
 * exporting a JSX-returning component requires a sibling
 * `<name>.stories.tsx` in the same directory.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Every @wire/ui component needs a sibling Storybook story file.",
    },
    schema: [],
    messages: {
      missingStory:
        "'{{name}}' has no Storybook story. Add {{storyPath}} covering its variants, with Wire-relevant example data (see the design-system and ui-component-creator skills).",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (filename.endsWith(".stories.tsx") || !filename.endsWith(".tsx")) {
      return {};
    }

    const match = STORY_SOURCE_PATH.exec(filename);
    if (!match?.groups) {
      return {};
    }
    const storyPath = `${match.groups.base}.stories.tsx`;
    const hasStory = existsSync(storyPath);

    function check(name, node) {
      if (!hasStory) {
        context.report({
          node,
          messageId: "missingStory",
          data: { name, storyPath: storyPath.split("/").pop() },
        });
      }
    }

    return {
      FunctionDeclaration(node) {
        if (node.id && returnsJsx(node)) {
          check(node.id.name, node.id);
        }
      },
      VariableDeclarator(node) {
        if (
          node.id.type === "Identifier" &&
          node.init &&
          returnsJsx(node.init)
        ) {
          check(node.id.name, node.id);
        }
      },
    };
  },
};
