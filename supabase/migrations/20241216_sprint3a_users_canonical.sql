-- Sprint 3A: Canonical UUID user_id with FK to public.users(id)
-- Bulletproof RLS + Data Integrity Foundation
-- supabase/migrations/20241216_sprint3a_users_canonical.sql

-- ============================================
-- PHASE 1: Ensure public.users table exists
-- ============================================

-- Create public.users if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast clerk_user_id lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id 
  ON public.users (clerk_user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PHASE 2: Migrate from profiles to users (if needed)
-- ============================================

-- If profiles table exists, migrate data to users
-- This ensures backward compatibility
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Insert profiles into users (ignore conflicts)
    INSERT INTO public.users (id, clerk_user_id, created_at, updated_at)
    SELECT 
      p.id,
      p.clerk_user_id,
      COALESCE(p.created_at, now()),
      COALESCE(p.updated_at, now())
    FROM public.profiles p
    WHERE p.clerk_user_id IS NOT NULL
    ON CONFLICT (clerk_user_id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- PHASE 3: RLS Helper Function
-- ============================================

-- Create helper function to get current user's UUID from JWT
-- This safely maps Clerk JWT 'sub' claim to public.users.id
CREATE OR REPLACE FUNCTION public.current_user_row_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  clerk_id text;
  user_uuid uuid;
BEGIN
  -- Extract Clerk user ID from JWT 'sub' claim
  clerk_id := (current_setting('request.jwt.claims', true)::jsonb->>'sub');
  
  -- If no JWT or no sub claim, return NULL (unauthenticated)
  IF clerk_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Look up user UUID from public.users
  SELECT id INTO user_uuid
  FROM public.users
  WHERE clerk_user_id = clerk_id
  LIMIT 1;
  
  RETURN user_uuid;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_row_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_row_id() TO anon;

-- ============================================
-- PHASE 4: Enable RLS on users table
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own row
CREATE POLICY "Users can view own user row"
  ON public.users
  FOR SELECT
  USING (id = public.current_user_row_id());

-- Policy: Users can update their own row
CREATE POLICY "Users can update own user row"
  ON public.users
  FOR UPDATE
  USING (id = public.current_user_row_id());

-- ============================================
-- NOTES FOR NEXT PHASE
-- ============================================

-- Next migration will:
-- 1. Add owner_id uuid column to each app table
-- 2. Backfill owner_id from existing user_id (handling both UUID and text formats)
-- 3. Drop old user_id column
-- 4. Rename owner_id → user_id
-- 5. Add FK constraint: user_id uuid NOT NULL REFERENCES public.users(id)
-- 6. Add indexes
-- 7. Update RLS policies to use current_user_row_id()

-- Target tables:
-- - public.crm_contacts
-- - public.tasks
-- - public.deals
-- - public.habits
-- - public.habit_logs
-- - public.journal_entries
-- (and any others that have user_id columns)

