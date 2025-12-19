import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

/**
 * Server-only admin Supabase client
 * 
 * This client uses the service role key and bypasses RLS.
 * NEVER import this into client-side code (components, 'use client' files).
 * Only use in:
 * - API routes (app/api/.../route.ts)
 * - Server actions
 * - Server-only lib files
 * 
 * The "server-only" import at the top prevents this module from being imported
 * into client-side code - Next.js will throw a build error if attempted.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// Backward-compatible alias (remove later when all imports are migrated)
export const supabaseAdminClient = supabaseAdmin;

