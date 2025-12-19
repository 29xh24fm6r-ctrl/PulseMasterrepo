-- CONTACTS: minimal hardening for Supabase-only persistence
-- Migration: 20241216_contacts_hardening.sql
-- Purpose: Add indexes and triggers to prevent duplicates and track updates

-- Note: This migration targets `crm_contacts` table (not `contacts`)
-- Adjust table name if your canonical table is different

-- 1) Ensure key columns exist (skip if you already have them)
-- These should already exist, but adding for safety
DO $$
BEGIN
  -- Add columns only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'crm_contacts' 
                 AND column_name = 'first_name') THEN
    ALTER TABLE public.crm_contacts ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'crm_contacts' 
                 AND column_name = 'last_name') THEN
    ALTER TABLE public.crm_contacts ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'crm_contacts' 
                 AND column_name = 'full_name') THEN
    ALTER TABLE public.crm_contacts ADD COLUMN full_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'crm_contacts' 
                 AND column_name = 'created_at') THEN
    ALTER TABLE public.crm_contacts ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'crm_contacts' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.crm_contacts ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2) Helpful indexes (avoid hard-unique on full_name; email index is partial)
-- These indexes help with duplicate detection and query performance

CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_email_lower
  ON public.crm_contacts (user_id, lower(primary_email))
  WHERE primary_email IS NOT NULL AND length(primary_email) > 0;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_normalized_email
  ON public.crm_contacts (user_id, normalized_email)
  WHERE normalized_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_full_name_lower
  ON public.crm_contacts (user_id, lower(full_name))
  WHERE full_name IS NOT NULL AND length(full_name) > 0;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_normalized_full_name
  ON public.crm_contacts (user_id, normalized_full_name)
  WHERE normalized_full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner_user_id
  ON public.crm_contacts (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

-- 3) Optional: updated_at trigger (only if you don't already have one)
DO $$
BEGIN
  -- Create function if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'set_updated_at' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  -- Create trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_crm_contacts_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_crm_contacts_set_updated_at
      BEFORE UPDATE ON public.crm_contacts
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 4) Comments for documentation
COMMENT ON INDEX idx_crm_contacts_user_email_lower IS 
  'Index for fast duplicate email lookup per user (case-insensitive)';
COMMENT ON INDEX idx_crm_contacts_user_normalized_email IS 
  'Index for normalized email deduplication';
COMMENT ON INDEX idx_crm_contacts_user_full_name_lower IS 
  'Index for fast duplicate name lookup per user (case-insensitive)';
COMMENT ON INDEX idx_crm_contacts_owner_user_id IS 
  'Index for filtering contacts by Clerk owner_user_id';

