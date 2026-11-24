import base from "@wire/eslint-config";
import wireApi from "@wire/eslint-plugin-wire-api";

export default [
  ...base,
  {
    rules: {
      // Nest relies on parameter decorators + injected classes with no explicit return types
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    files: ["src/**/*.controller.ts"],
    plugins: { "wire-api": wireApi },
    rules: {
      "wire-api/require-api-response": "error",
      "wire-api/controller-verb-naming": "warn",
      "wire-api/require-permission": "error",
      "wire-api/no-em-dash-in-api-description": "error",
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/common/interceptors/**", "src/common/filters/**", "src/common/middleware/**"],
    plugins: { "wire-api": wireApi },
    rules: {
      "wire-api/no-bare-error-throw": "error",
      "wire-api/no-manual-envelope": "error",
      "wire-api/no-numeric-id": "error",
    },
  },
  {
    files: ["src/**/dto/*.dto.ts"],
    plugins: { "wire-api": wireApi },
    rules: {
      "wire-api/require-api-property-example": "error",
      "wire-api/no-em-dash-in-api-description": "error",
    },
  },
  {
    files: ["scripts/export-openapi.ts"],
    plugins: { "wire-api": wireApi },
    rules: {
      "wire-api/no-em-dash-in-api-description": "error",
    },
  },
];
