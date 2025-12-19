-- Sprint 4.2: Autopilot v2 (Suggest-Only) + Audit Log
-- supabase/migrations/20241216_sprint4_2_autopilot_suggestions.sql

-- ============================================
-- AUTOMATION SUGGESTIONS (Suggest-Only)
-- ============================================

CREATE TABLE IF NOT EXISTS public.automation_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.automation_runs(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES public.automation_policies(id) ON DELETE SET NULL,
  
  suggestion_type text NOT NULL,              -- 'create_task' | 'nudge_deal' | 'followup' | 'prioritize_task' | ...
  suggestion_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,                                 -- why this suggestion was made
  
  idempotency_key text,
  
  status text NOT NULL DEFAULT 'suggested',    -- 'suggested' | 'dismissed' | 'approved' (execution later)
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_suggestion_status CHECK (status IN ('suggested', 'dismissed', 'approved'))
);

CREATE INDEX IF NOT EXISTS idx_automation_suggestions_user_status 
  ON public.automation_suggestions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_suggestions_run 
  ON public.automation_suggestions (run_id) 
  WHERE run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_suggestions_policy 
  ON public.automation_suggestions (policy_id) 
  WHERE policy_id IS NOT NULL;

-- Unique constraint: prevent duplicate suggestions per user+type+idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS uniq_automation_suggestions_idempotency 
  ON public.automation_suggestions (user_id, suggestion_type, idempotency_key) 
  WHERE idempotency_key IS NOT NULL AND status = 'suggested';

-- ============================================
-- UPDATE AUTOMATION POLICIES
-- ============================================

-- Add max_suggestions_per_day if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automation_policies' 
    AND column_name = 'max_suggestions_per_day'
  ) THEN
    ALTER TABLE public.automation_policies 
    ADD COLUMN max_suggestions_per_day int NOT NULL DEFAULT 50;
  END IF;
END $$;

-- ============================================
-- UPDATE AUTOMATION RUNS
-- ============================================

-- Add detectors and suggestions_created if they don't exist
-- Also make run_type nullable or set default if it exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automation_runs' 
    AND column_name = 'detectors'
  ) THEN
    ALTER TABLE public.automation_runs 
    ADD COLUMN detectors jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automation_runs' 
    AND column_name = 'suggestions_created'
  ) THEN
    ALTER TABLE public.automation_runs 
    ADD COLUMN suggestions_created int DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automation_runs' 
    AND column_name = 'correlation_id'
  ) THEN
    ALTER TABLE public.automation_runs 
    ADD COLUMN correlation_id uuid;
  END IF;
  
  -- Make run_type nullable if it exists and is NOT NULL (for backward compatibility)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automation_runs' 
    AND column_name = 'run_type'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.automation_runs 
    ALTER COLUMN run_type DROP NOT NULL;
  END IF;
END $$;

-- ============================================
-- UPDATE AUDIT LOG
-- ============================================

-- Update audit_log to match spec (add source, event_type if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.audit_log 
    ADD COLUMN source text NOT NULL DEFAULT 'system';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log' 
    AND column_name = 'event_type'
  ) THEN
    ALTER TABLE public.audit_log 
    ADD COLUMN event_type text;
  END IF;
END $$;

-- Update existing audit_log rows to have source if null
UPDATE public.audit_log 
SET source = COALESCE(source, 'system')
WHERE source IS NULL;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.automation_suggestions ENABLE ROW LEVEL SECURITY;

-- Automation Suggestions: Users can view and update their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON public.automation_suggestions FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own suggestions"
  ON public.automation_suggestions FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_automation_suggestions_updated_at
  BEFORE UPDATE ON public.automation_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

