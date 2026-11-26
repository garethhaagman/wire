// @ts-check

/**
 * Canonical @wire/ui export name -> synonyms that mean "this is the same kind
 * of primitive, don't reinvent it locally". Matching is exact-name (case
 * insensitive), not substring, so composed/specific names like `IconButton`
 * or `PasswordInput` are intentionally NOT flagged — only a component that
 * claims to *be* a primitive @wire/ui already exports.
 */
const SYNONYMS = {
  Button: ["Button", "Btn"],
  Card: ["Card"],
  Input: ["Input", "TextInput", "Textfield", "TextField"],
  Label: ["Label"],
  Modal: ["Modal", "Dialog"],
  Select: ["Select", "Dropdown"],
  Checkbox: ["Checkbox"],
  Radio: ["Radio", "RadioButton"],
  Switch: ["Switch", "Toggle"],
  Tooltip: ["Tooltip"],
  Badge: ["Badge"],
  Avatar: ["Avatar"],
};

const NAME_TO_CANONICAL = new Map();
for (const [canonical, names] of Object.entries(SYNONYMS)) {
  for (const name of names) {
    NAME_TO_CANONICAL.set(name.toLowerCase(), canonical);
  }
}

const PACKAGES_UI_PATH = /[/\\]packages[/\\]ui[/\\]/u;

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
    // forwardRef(fn), memo(fn)
    return node.arguments.some((arg) => returnsJsx(arg));
  }
  return false;
}

/**
 * @wire/ui already exports Button/Card/Input/Label (and, as the design
 * system grows, more primitives). A locally defined component reusing one of
 * those names is almost always an accidental duplicate — the same drift
 * `no-hardcoded-colors` prevents at the token level, one level up at the
 * component level. See .claude/skills/design-system and
 * .claude/skills/ui-component-creator.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "New components must reuse an existing @wire/ui primitive by name, not redefine one locally.",
    },
    schema: [],
    messages: {
      duplicatePrimitive:
        "'{{name}}' duplicates a primitive already in @wire/ui ({{canonical}}). Import it from '@wire/ui', or compose it, instead of redefining it locally — see the design-system and ui-component-creator skills.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (PACKAGES_UI_PATH.test(filename)) {
      return {};
    }

    function check(name, node) {
      const canonical = NAME_TO_CANONICAL.get(name.toLowerCase());
      if (canonical) {
        context.report({
          node,
          messageId: "duplicatePrimitive",
          data: { name, canonical },
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
