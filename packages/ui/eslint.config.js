import react from "@wire/eslint-config/react";
import wireUi from "@wire/eslint-plugin-wire-ui";

export default [
  ...react,
  { ignores: ["storybook-static/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "wire-ui": wireUi },
    rules: {
      "wire-ui/no-hardcoded-colors": "error",
      "wire-ui/require-storybook-story": "error",
    },
  },
];
