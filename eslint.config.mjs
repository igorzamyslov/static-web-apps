import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Never lint build output or dependencies.
  {
    ignores: ["**/dist/**", "**/node_modules/**", "_build/**", "_site/**", "**/*.min.js"],
  },

  // Baseline: recommended JS + strict TypeScript (non-type-checked, so the
  // whole repo lints from a single root install without per-app deps).
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // Extra strictness applied everywhere.
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-implicit-coercion": "error",
      "no-param-reassign": "error",
      "prefer-template": "error",
      "object-shorthand": "error",
      curly: ["error", "all"],
    },
  },

  // Tooling that runs in Node (build scripts, config files): allow console,
  // provide Node globals.
  {
    files: ["scripts/**", "**/*.config.{js,mjs,ts}", "**/build.mjs"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },

  // Turn off stylistic rules that Prettier owns. Keep this last.
  prettier,
);
