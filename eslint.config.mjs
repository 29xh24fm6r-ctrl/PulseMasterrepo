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
  // Prevent importing server-only supabase admin client in client code
  // Allow in API routes (app/api/**) and lib/** (server-only files)
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
    ],
    ignores: [
      "app/api/**", // API routes are server-side, allow admin client
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message: "Do not import server-only supabase admin client in client code. Use the browser client or call an API route.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/supabase/admin*"],
              message: "Do not import server-only supabase admin client in client code. Use the browser client or call an API route.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
