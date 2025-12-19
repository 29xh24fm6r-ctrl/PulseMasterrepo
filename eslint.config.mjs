// eslint.config.mjs

// Release-friendly ESLint config:
// - Keep signal, reduce noise
// - Do not fail release on legacy "any"/unused vars in scripts/tests
// - Prevents 1000s of lint errors from blocking CI

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // 0) Global ignores (never lint these)
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.min.*",
      "**/*.d.ts",
      "**/generated/**",
      "**/supabase/.temp/**",
    ],
  },

  // 1) Base JS recommended
  js.configs.recommended,

  // 2) Next.js recommended rules (App Router)
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // 3) TypeScript recommended (with type-aware linting)
  // If this becomes slow, we can switch to non-type-aware rules later.
  ...tseslint.configs.recommendedTypeChecked,

  // 4) Shared TS/JS language options
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        // Make sure ESLint can find your TS config
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      // ✅ RELEASE MODE: do not block on these across the whole repo
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Common quality rules you DO want:
      "no-debugger": "warn",
      "no-console": "off", // many server routes/loggers intentionally use console in ops areas
    },
  },

  // 5) Tests & scripts: even more permissive
  {
    files: ["**/tests/**/*.{ts,tsx,js,jsx}", "**/scripts/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
    },
  },

  // 6) Next route handlers often have flexible request/params shapes
  {
    files: ["**/app/**/route.ts", "**/app/**/route.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
