-- Add pattern contribution opt-in to civilization_settings
-- supabase/migrations/20260115_civilization_pattern_optin.sql

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'civilization_settings' 
    AND column_name = 'contribute_anonymous_patterns'
  ) THEN
    ALTER TABLE public.civilization_settings
    ADD COLUMN contribute_anonymous_patterns boolean not null default false;
  END IF;
END $$;


