
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper to safely get env vars during build
function getSupabasePublicEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // During Next build / CI, allow missing envs
    if (process.env.CI || process.env.NEXT_PHASE === "phase-production-build") {
        return {
            url: url ?? "http://localhost:54321",
            anon: anon ?? "anon-placeholder",
        };
    }

    if (!url || !anon) {
        throw new Error("Missing Supabase public environment variables");
    }

    return { url, anon };
}

export function createClient() {
    const { url, anon } = getSupabasePublicEnv();
    return createSupabaseClient(url, anon);
}
