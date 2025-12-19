// lib/features/canary/hints.ts

import type { CanaryFixHint } from "@/lib/features/canary.types";

export function hintMissingTable(table: string): CanaryFixHint {
  return {
    kind: "MISSING_TABLE",
    summary: `Missing DB table: ${table}`,
    nextSteps: [
      `Verify the migration that creates "${table}" has been applied in Supabase.`,
      "If using Supabase CLI, run: supabase db push (or apply migrations in dashboard).",
    ],
    evidence: { table },
  };
}

export function hintRlsDenied(table: string): CanaryFixHint {
  return {
    kind: "RLS_DENIED",
    summary: `RLS / permissions blocked access to table: ${table}`,
    nextSteps: [
      `Check RLS policies for "${table}".`,
      "Confirm authenticated users can SELECT their own rows.",
    ],
    evidence: { table },
  };
}

export function hintApiDown(path: string): CanaryFixHint {
  return {
    kind: "API_DOWN",
    summary: `API endpoint failed: ${path}`,
    nextSteps: [
      "Check the route exists and is deployed.",
      "Check auth requirements (Clerk) and server logs.",
    ],
    evidence: { path },
  };
}

export function hintMissingEnv(keys: string[]): CanaryFixHint {
  return {
    kind: "MISSING_ENV",
    summary: `Missing required env vars: ${keys.join(", ")}`,
    nextSteps: [
      "Add the missing variables in Vercel / CI secrets.",
      "Confirm .env.local is not relied upon in CI.",
    ],
    evidence: { keys },
  };
}
