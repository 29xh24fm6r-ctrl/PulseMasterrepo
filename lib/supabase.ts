import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

if (typeof window === 'undefined' && !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable (server-side only)')
}

// Client for browser (uses anon key with RLS)
// Create client only if we have valid values, otherwise use a minimal valid client
export const supabase: SupabaseClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(
      supabaseUrl || 'https://your-project.supabase.co',
      supabaseAnonKey || 'your-anon-key-here'
    )

// Admin client for server-side (bypasses RLS)
// Only create if we have the service key (server-side only)
export const supabaseAdmin: SupabaseClient = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createClient(
      supabaseUrl || 'https://your-project.supabase.co',
      supabaseServiceKey || 'your-service-role-key-here'
    )
