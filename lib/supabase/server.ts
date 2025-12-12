import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with service role key
 * NEVER use anon key for user-owned data operations in beta
 * This bypasses RLS and should only be used server-side
 */
export function supabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }
  
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });
}

