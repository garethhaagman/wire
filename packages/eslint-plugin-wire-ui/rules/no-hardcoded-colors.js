// @ts-check

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILITY =
  "bg|text|border(?:-[xytrbl])?|ring|ring-offset|outline|divide|fill|stroke|from|via|to|placeholder|caret|accent|decoration|shadow";

// `bg-indigo-500`, `hover:text-gray-700/50`, `border-white`, `bg-[#fff]`, `text-[rgb(0,0,0)]`
const TAILWIND_COLOR_CLASS = new RegExp(
  `(?:^|[\\s:!])((?:${COLOR_UTILITY})-(?:(?:${PALETTE})-\\d{2,3}|black|white|\\[(?:#|rgba?\\(|hsla?\\(|oklch\\(|oklab\\(|color\\()[^\\]]*\\]))(?:\\/\\S+)?(?=$|\\s)`,
  "g",
);
const CSS_COLOR_VALUE = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/i;

/**
 * Every color must come from the theme tokens (`bg-primary`, `text-muted-foreground`,
 * `var(--border)`), which applyTheme() fills from the resolved UiConfig. A hardcoded
 * palette class or color literal silently ignores an org's or user's theme — see
 * internal-docs/ui/theming-and-layout.md "How resolution becomes pixels".
 *
 * Flags Tailwind palette/arbitrary color utilities in any string, and color literals
 * in JSX `style={{ ... }}` objects.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Colors must come from UiConfig theme tokens, never hardcoded palette classes or literals.",
    },
    schema: [],
    messages: {
      tailwindColor:
        "'{{value}}' hardcodes a color and ignores the org/user theme. Use a theme token utility (bg-primary, text-muted-foreground, border-border, ...) — see internal-docs/ui/theming-and-layout.md.",
      styleColor:
        "Inline style color '{{value}}' ignores the org/user theme. Use a theme token (var(--primary)) or a Tailwind token utility instead — see internal-docs/ui/theming-and-layout.md.",
    },
  },
  create(context) {
    function checkClassString(node, text) {
      for (const match of text.matchAll(TAILWIND_COLOR_CLASS)) {
        context.report({ node, messageId: "tailwindColor", data: { value: match[1] } });
      }
    }

    function isInsideStyleAttribute(node) {
      for (let current = node.parent; current; current = current.parent) {
        if (current.type === "JSXAttribute") {
          return current.name.type === "JSXIdentifier" && current.name.name === "style";
        }
      }
      return false;
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (isInsideStyleAttribute(node)) {
          if (CSS_COLOR_VALUE.test(node.value)) {
            context.report({ node, messageId: "styleColor", data: { value: node.value } });
          }
          return;
        }
        checkClassString(node, node.value);
      },
      TemplateElement(node) {
        checkClassString(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};
