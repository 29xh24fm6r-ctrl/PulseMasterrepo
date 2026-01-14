// app/api/voice/_lib/env.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Voice API env helper.
 *
 * Rules:
 * - Server routes should prefer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * - Allow NEXT_PUBLIC_SUPABASE_URL as fallback to avoid naming drift
 * - NEVER read required env at module scope in route handlers
 */

export function getSupabaseUrl(): string {
    const v = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!v) throw new Error("Missing env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL fallback)");
    return v;
}


export function getServiceRoleKey(): string {
    const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!v) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    return v;
}

export function getEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

export function createAdminClient() {
    return createClient(getSupabaseUrl(), getServiceRoleKey());
}
