
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase credentials missing in environment variables.");
        // Return a dummy client or throw, but prevents build-time top-level crash
        // For client-side, throwing inside the function is better than crashing module load
        throw new Error("Supabase credentials missing");
    }
    return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
