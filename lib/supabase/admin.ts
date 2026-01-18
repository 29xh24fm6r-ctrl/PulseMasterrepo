// lib/supabase/admin.ts
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

/**
 * NOTE:
 * - Uses SERVICE_ROLE to write runs/events reliably.
 * - RLS is still valuable for client reads; server writes are trusted.
 * - Keep all env reads INSIDE functions to remain build-safe.
 */
export function getSupabaseAdmin() {
    return getSupabaseAdminRuntimeClient();
}
