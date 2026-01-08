import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Lazy initialization to prevent build-time crashes when env vars are missing
let client: SupabaseClient<Database> | null = null;

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
    get: (_target, prop) => {
        if (!client) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!url || !key) {
                // During build time (static generation), we might not have keys.
                // Return a dummy client that throws on use, or handled error.
                if (process.env.NODE_ENV === "production" && !key) {
                    console.warn("⚠️ Attempting to access supabaseAdmin without SUPABASE_SERVICE_ROLE_KEY. This is expected during build time for static pages.");
                }

                throw new Error(
                    `Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. (Key present? ${!!key})`
                );
            }

            client = createClient<Database>(url, key, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
        }
        return Reflect.get(client, prop);
    },
});
