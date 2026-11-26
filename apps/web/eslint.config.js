import tanstackQuery from "@tanstack/eslint-plugin-query";
import react from "@wire/eslint-config/react";
import wireUi from "@wire/eslint-plugin-wire-ui";

export default [
  ...react,
  ...tanstackQuery.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "wire-ui": wireUi },
    rules: {
      "wire-ui/no-hardcoded-colors": "error",
      "wire-ui/no-raw-query-keys": "error",
      "wire-ui/use-design-system-primitives": "error",
    },
  },
];
