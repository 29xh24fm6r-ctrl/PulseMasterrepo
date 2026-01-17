// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

/**
 * NOTE:
 * - Uses SERVICE_ROLE to write runs/events reliably.
 * - RLS is still valuable for client reads; server writes are trusted.
 * - Keep all env reads INSIDE functions to remain build-safe.
 */
export function getSupabaseAdmin() {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL"); // Adjusted to user's likely env name
    const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    return createClient(url, key, {
        auth: { persistSession: false },
    });
}
