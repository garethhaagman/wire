import base from "@wire/eslint-config";
import wireApi from "@wire/eslint-plugin-wire-api";

export default [
  ...base,
  {
    files: ["src/**/*.ts"],
    plugins: { "wire-api": wireApi },
    rules: {
      "wire-api/no-numeric-id": "error",
    },
  },
];
