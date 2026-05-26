// Flat config (ESLint 9). One config covers all workspaces; targeted overrides
// add React/a11y rules for the web app and relax type-aware rules for tests.
//
// Run from the repo root:
//   bun run lint        # report
//   bun run lint:fix    # auto-fix what's safe
//
// Prettier owns formatting — eslint-config-prettier strips all stylistic
// rules so the two don't argue about whitespace.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/node_modules/**",
      "apps/api/drizzle/**",
      "apps/web/test-results/**",
      "apps/web/playwright-report/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Defaults that apply everywhere TS/TSX is touched.
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
    rules: {
      // Allow `_`-prefixed unused vars (intentional placeholders).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // `any` is sometimes load-bearing (Zod schemas, generic helpers).
      // Flag it as a warning, not an error.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  {
    // NestJS API — Node globals.
    files: ["apps/api/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    // React web — JSX, hooks, a11y.
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // We use the new JSX transform — no need to import React.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // react-hook-form's `watch()` is a stable API; the v7 rule flags it
      // as a false positive on every controlled-form component.
      "react-hooks/incompatible-library": "off",
      // We deliberately mirror URL search params into local input state in
      // the Catalog (see Services.tsx). setState-in-effect is the simplest
      // correct pattern for that — the v7 rule is a hint, not a bug.
      "react-hooks/set-state-in-effect": "off",
      // autoFocus on the login email field is a deliberate UX choice on a
      // focused task page, not a usability problem.
      "jsx-a11y/no-autofocus": "warn",
    },
  },

  {
    // shadcn/ui generated wrappers — CardTitle etc. accept arbitrary children
    // via slot patterns the static analyser can't trace. The heading content
    // is always present in practice.
    files: ["apps/web/src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "jsx-a11y/heading-has-content": "off",
    },
  },

  {
    // Tests get test globals and more lenient rules.
    files: [
      "apps/api/test/**/*.ts",
      "apps/web/e2e/**/*.ts",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Must come last — strips all stylistic rules so Prettier owns formatting.
  prettierConfig,
);
