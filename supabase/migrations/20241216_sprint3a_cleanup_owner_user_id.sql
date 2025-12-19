-- Sprint 3A: Cleanup owner_user_id from app tables
-- Part 4: Remove owner_user_id column (keep only user_id UUID)
-- supabase/migrations/20241216_sprint3a_cleanup_owner_user_id.sql

-- ============================================
-- NOTE: owner_user_id is ONLY stored in public.users table
-- App tables should ONLY have user_id uuid FK
-- ============================================

-- Remove owner_user_id from app tables (if it exists)
-- This column was used for Clerk ID tracking, but now we only need user_id UUID

-- CRM CONTACTS
ALTER TABLE public.crm_contacts DROP COLUMN IF EXISTS owner_user_id;

-- TASKS
ALTER TABLE public.tasks DROP COLUMN IF EXISTS owner_user_id;

-- DEALS
ALTER TABLE public.deals DROP COLUMN IF EXISTS owner_user_id;

-- HABITS
ALTER TABLE public.habits DROP COLUMN IF EXISTS owner_user_id;

-- HABIT LOGS
ALTER TABLE public.habit_logs DROP COLUMN IF EXISTS owner_user_id;

-- JOURNAL ENTRIES
ALTER TABLE public.journal_entries DROP COLUMN IF EXISTS owner_user_id;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify no owner_user_id columns remain in app tables:
-- SELECT 
--   table_name, 
--   column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND column_name = 'owner_user_id'
--   AND table_name NOT IN ('users');

-- Expected result: 0 rows (owner_user_id only exists in public.users as clerk_user_id)

