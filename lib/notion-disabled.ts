import "server-only";

/**
 * Notion is no longer supported in Pulse runtime.
 * Supabase is the official database (see project policy).
 *
 * Any runtime attempt to use Notion should fail loudly.
 */
export function notionDisabled(): never {
  throw new Error(
    "Notion runtime is disabled. Use Supabase-backed services and API routes instead."
  );
}

