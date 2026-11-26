// @ts-check
import tsParser from "@typescript-eslint/parser";
import noEmDash from "./rules/no-em-dash.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.config.js",
      "*.config.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { wire: { rules: { "no-em-dash": noEmDash } } },
    rules: {
      "wire/no-em-dash": "error",
    },
  },
];
