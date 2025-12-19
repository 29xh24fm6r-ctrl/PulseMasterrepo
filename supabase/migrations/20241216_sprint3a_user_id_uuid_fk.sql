-- Sprint 3A: Convert all app tables to UUID user_id with FK
-- Part 2: Migrate user_id columns to UUID FK pattern
-- supabase/migrations/20241216_sprint3a_user_id_uuid_fk.sql

-- ============================================
-- HELPER: Detect and backfill user_id safely
-- ============================================

-- This function helps migrate user_id columns by:
-- 1. Detecting if current user_id is UUID (already correct) or text (Clerk ID)
-- 2. Backfilling the new owner_id column accordingly
CREATE OR REPLACE FUNCTION public.migrate_user_id_to_uuid_fk(
  table_name text,
  user_id_column text DEFAULT 'user_id'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  temp_column text := 'owner_id_temp';
  fk_name text;
  idx_name text;
BEGIN
  -- Step 1: Add temporary owner_id column
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I uuid', table_name, temp_column);
  
  -- Step 2: Backfill owner_id
  -- Case A: If user_id is already UUID (text representation), cast it
  EXECUTE format('
    UPDATE %I t
    SET %I = CASE
      WHEN t.%I::text ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' 
        THEN t.%I::uuid
      ELSE (
        SELECT u.id 
        FROM public.users u 
        WHERE u.clerk_user_id = t.%I::text
        LIMIT 1
      )
    END
    WHERE t.%I IS NOT NULL
  ', table_name, temp_column, user_id_column, user_id_column, user_id_column, user_id_column, user_id_column);
  
  -- Step 3: Validate no nulls (should not happen if migration is clean)
  -- If nulls exist, log warning but continue
  RAISE NOTICE 'Migration complete for table: %', table_name;
END;
$$;

-- ============================================
-- TABLE 1: crm_contacts
-- ============================================

-- Add temporary owner_id column
ALTER TABLE public.crm_contacts 
  ADD COLUMN IF NOT EXISTS owner_id_temp uuid;

-- Backfill: Handle both UUID and text formats
UPDATE public.crm_contacts t
SET owner_id_temp = CASE
  -- If user_id is already UUID (as text), cast it
  WHEN t.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN t.user_id::uuid
  -- If user_id is Clerk ID (text), look up UUID
  ELSE (
    SELECT u.id 
    FROM public.users u 
    WHERE u.clerk_user_id = t.user_id::text
    LIMIT 1
  )
END
WHERE t.user_id IS NOT NULL;

-- Validate: Check for nulls (should be zero)
DO $$
DECLARE
  null_count int;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.crm_contacts
  WHERE owner_id_temp IS NULL AND user_id IS NOT NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING 'Found % rows with unmapped user_id in crm_contacts', null_count;
  END IF;
END $$;

-- Drop old user_id column (if it exists as non-UUID)
-- First, drop any indexes/constraints
DROP INDEX IF EXISTS idx_crm_contacts_user_id;
DROP INDEX IF EXISTS uniq_crm_active_email_per_user;
DROP INDEX IF EXISTS uniq_crm_active_phone_per_user;

-- Drop old column
ALTER TABLE public.crm_contacts DROP COLUMN IF EXISTS user_id;

-- Rename owner_id_temp → user_id
ALTER TABLE public.crm_contacts RENAME COLUMN owner_id_temp TO user_id;

-- Add NOT NULL constraint
ALTER TABLE public.crm_contacts ALTER COLUMN user_id SET NOT NULL;

-- Add FK constraint
ALTER TABLE public.crm_contacts 
  ADD CONSTRAINT fk_crm_contacts_user_id 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_id 
  ON public.crm_contacts (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_crm_active_email_per_user
  ON public.crm_contacts (user_id, normalized_email)
  WHERE status = 'active' AND normalized_email IS NOT NULL AND normalized_email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_crm_active_phone_per_user
  ON public.crm_contacts (user_id, normalized_phone)
  WHERE status = 'active' AND normalized_phone IS NOT NULL AND normalized_phone <> '';

-- ============================================
-- TABLE 2: tasks
-- ============================================

ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS owner_id_temp uuid;

UPDATE public.tasks t
SET owner_id_temp = CASE
  WHEN t.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN t.user_id::uuid
  ELSE (
    SELECT u.id FROM public.users u WHERE u.clerk_user_id = t.user_id::text LIMIT 1
  )
END
WHERE t.user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_tasks_user_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.tasks RENAME COLUMN owner_id_temp TO user_id;
ALTER TABLE public.tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.tasks 
  ADD CONSTRAINT fk_tasks_user_id 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);

-- ============================================
-- TABLE 3: deals
-- ============================================

ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS owner_id_temp uuid;

UPDATE public.deals t
SET owner_id_temp = CASE
  WHEN t.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN t.user_id::uuid
  ELSE (
    SELECT u.id FROM public.users u WHERE u.clerk_user_id = t.user_id::text LIMIT 1
  )
END
WHERE t.user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_deals_user_id;
ALTER TABLE public.deals DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.deals RENAME COLUMN owner_id_temp TO user_id;
ALTER TABLE public.deals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.deals 
  ADD CONSTRAINT fk_deals_user_id 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON public.deals (user_id);

-- ============================================
-- TABLE 4: habits
-- ============================================

ALTER TABLE public.habits 
  ADD COLUMN IF NOT EXISTS owner_id_temp uuid;

UPDATE public.habits t
SET owner_id_temp = CASE
  WHEN t.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN t.user_id::uuid
  ELSE (
    SELECT u.id FROM public.users u WHERE u.clerk_user_id = t.user_id::text LIMIT 1
  )
END
WHERE t.user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_habits_user_id;
ALTER TABLE public.habits DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.habits RENAME COLUMN owner_id_temp TO user_id;
ALTER TABLE public.habits ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.habits 
  ADD CONSTRAINT fk_habits_user_id 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits (user_id);

-- ============================================
-- TABLE 5: habit_logs
-- ============================================

ALTER TABLE public.habit_logs 
  ADD COLUMN IF NOT EXISTS owner_id_temp uuid;

UPDATE public.habit_logs t
SET owner_id_temp = CASE
  WHEN t.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN t.user_id::uuid
  ELSE (
    SELECT u.id FROM public.users u WHERE u.clerk_user_id = t.user_id::text LIMIT 1
  )
END
WHERE t.user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_habit_logs_user_id;
ALTER TABLE public.habit_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.habit_logs RENAME COLUMN owner_id_temp TO user_id;
ALTER TABLE public.habit_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.habit_logs 
  ADD CONSTRAINT fk_habit_logs_user_id 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON public.habit_logs (user_id);

-- ============================================
-- TABLE 6: journal_entries
-- ============================================

ALTER TABLE public.journal_entries 
  ADD COLUMN IF NOT EXISTS owner_id_temp uuid;

UPDATE public.journal_entries t
SET owner_id_temp = CASE
  WHEN t.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN t.user_id::uuid
  ELSE (
    SELECT u.id FROM public.users u WHERE u.clerk_user_id = t.user_id::text LIMIT 1
  )
END
WHERE t.user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_journal_entries_user_id;
ALTER TABLE public.journal_entries DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.journal_entries RENAME COLUMN owner_id_temp TO user_id;
ALTER TABLE public.journal_entries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.journal_entries 
  ADD CONSTRAINT fk_journal_entries_user_id 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries (user_id);

-- ============================================
-- CLEANUP: Drop helper function
-- ============================================

DROP FUNCTION IF EXISTS public.migrate_user_id_to_uuid_fk(text, text);

