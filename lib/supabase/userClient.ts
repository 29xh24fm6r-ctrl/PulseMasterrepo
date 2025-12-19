// lib/supabase/userClient.ts
// User-scoped Supabase client (RLS enforced)
import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client scoped to the current user via JWT.
 * This ensures Row Level Security (RLS) policies are enforced.
 * 
 * @param accessToken - Supabase-compatible JWT from Clerk (JWT template: "supabase")
 * @returns Supabase client with user-scoped authentication
 */
export function createUserSupabaseClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!accessToken) {
    throw new Error("Missing Supabase access token for user-scoped client");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

