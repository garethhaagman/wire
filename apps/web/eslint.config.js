import react from "@wire/eslint-config/react";
import wireUi from "@wire/eslint-plugin-wire-ui";

export default [
  ...react,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "wire-ui": wireUi },
    rules: {
      "wire-ui/no-hardcoded-colors": "error",
    },
  },
];
