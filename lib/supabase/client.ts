
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isBuildPhase } from "@/lib/env/guard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper to check if we are on server
const isServer = typeof window === 'undefined';

export function createClient() {
    if ((!supabaseUrl || !supabaseAnonKey) && isServer && isBuildPhase()) {
        // Build-safe dummy for SSR/Generation
        return createSupabaseClient("https://example.supabase.co", "dummy-key", {
            global: {
                fetch: (...args) => Promise.reject(new Error("Supabase Build-Time Mock: Request Blocked")),
            }
        });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase credentials missing in environment variables.");
        throw new Error("Supabase credentials missing");
    }
    return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
