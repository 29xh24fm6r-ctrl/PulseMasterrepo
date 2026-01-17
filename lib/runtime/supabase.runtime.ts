import { createClient } from "@supabase/supabase-js";
import { assertRuntimeOnly } from "@/lib/env/runtime-phase";
import { Database } from "@/types/supabase"; // Absolute import is safer

let _client: ReturnType<typeof createClient<Database>> | null = null;
let _admin: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseRuntimeClient() {
    assertRuntimeOnly("Supabase");

    if (_client) return _client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
        throw new Error(
            "Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
    }

    _client = createClient<Database>(url, anon, {
        auth: { persistSession: false },
    });

    return _client;
}

export function getSupabaseAdminRuntimeClient() {
    assertRuntimeOnly("Supabase Admin");

    if (_admin) return _admin;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Fallback matches existing

    if (!url || !serviceRole) {
        throw new Error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    }

    _admin = createClient<Database>(url, serviceRole, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        }
    });

    return _admin;
}
