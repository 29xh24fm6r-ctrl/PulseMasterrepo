import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Supabase SDK must ONLY be imported in lib/runtime/*.runtime.ts",
            },
            {
              name: "stripe",
              message: "Stripe SDK must ONLY be imported in lib/runtime/*.runtime.ts",
            },
            {
              name: "resend",
              message: "Resend SDK must ONLY be imported in lib/runtime/*.runtime.ts",
            },
            {
              name: "openai",
              message: "OpenAI SDK must ONLY be imported in lib/runtime/*.runtime.ts",
            },
          ],
          patterns: [
            {
              group: ["@/services/stripe", "@/services/email/resend", "@/services/ai/openai"],
              message: "Do not import legacy service wrappers. Use dynamic imports from @/lib/runtime instead.",
            },
            {
              group: ["@/lib/runtime/*"],
              message: "Do not statically import runtime adapters. Use `await import()` inside request handlers or runtime-only code paths."
            }
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["lib/runtime/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
