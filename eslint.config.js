import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["dist", "coverage", "playwright-report", "node_modules"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.worker } }
  },
  {
    files: ["scripts/**/*.ts", "tests/**/*.ts", "*.ts"],
    languageOptions: { globals: globals.node }
  }
);
