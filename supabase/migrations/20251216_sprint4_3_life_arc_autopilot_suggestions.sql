-- Sprint 4.3: Life Arc Autopilot Suggestions (DB-aligned)
-- supabase/migrations/20251216_sprint4_3_life_arc_autopilot_suggestions.sql

-- ============================================
-- LIFE ARC AUTOPILOT SUGGESTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.life_arc_autopilot_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL,  -- Clerk user ID for RLS filtering
  
  policy_id uuid,  -- References plugin_automations.id
  run_id uuid REFERENCES public.life_arc_autopilot_runs(id) ON DELETE SET NULL,
  
  suggestion_type text NOT NULL,  -- 'prioritize_task' | 'nudge_deal' | 'followup' | etc.
  title text NOT NULL,
  detail text,
  priority text NOT NULL DEFAULT 'medium',  -- 'low' | 'medium' | 'high'
  
  entity_type text,  -- 'task' | 'deal' | 'contact' | etc.
  entity_id uuid,
  
  status text NOT NULL DEFAULT 'open',  -- 'open' | 'dismissed' | 'snoozed' | 'accepted'
  snoozed_until timestamptz,
  
  idempotency_key text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,  -- raw detector payload
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('open', 'dismissed', 'snoozed', 'accepted')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
);

-- Unique constraint: prevent duplicate suggestions per user+idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS uniq_life_arc_autopilot_suggestions_idempotency 
  ON public.life_arc_autopilot_suggestions (user_id, idempotency_key);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_life_arc_autopilot_suggestions_user_status 
  ON public.life_arc_autopilot_suggestions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_life_arc_autopilot_suggestions_run 
  ON public.life_arc_autopilot_suggestions (run_id) 
  WHERE run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_life_arc_autopilot_suggestions_policy 
  ON public.life_arc_autopilot_suggestions (policy_id) 
  WHERE policy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_life_arc_autopilot_suggestions_entity 
  ON public.life_arc_autopilot_suggestions (entity_type, entity_id) 
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_life_arc_autopilot_suggestions_snooze 
  ON public.life_arc_autopilot_suggestions (status, snoozed_until) 
  WHERE status = 'snoozed';

-- ============================================
-- UPDATE LIFE_ARC_AUTOPILOT_RUNS
-- ============================================

-- Add owner_user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'life_arc_autopilot_runs' 
    AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE public.life_arc_autopilot_runs 
    ADD COLUMN owner_user_id text;
  END IF;
END $$;

-- ============================================
-- UPDATE PLUGIN_AUTOMATIONS (if needed)
-- ============================================

-- Add owner_user_id if it doesn't exist (for Clerk ID filtering)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'plugin_automations' 
    AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE public.plugin_automations 
    ADD COLUMN owner_user_id text;
    
    -- Create index for filtering
    CREATE INDEX IF NOT EXISTS idx_plugin_automations_owner 
      ON public.plugin_automations (owner_user_id, trigger_event, action_type, is_active);
  END IF;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.life_arc_autopilot_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON public.life_arc_autopilot_suggestions FOR SELECT
  USING (user_id = public.current_user_row_id());

-- Users can update their own suggestions (dismiss, snooze, accept)
CREATE POLICY "Users can update own suggestions"
  ON public.life_arc_autopilot_suggestions FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_life_arc_autopilot_suggestions_updated_at
  BEFORE UPDATE ON public.life_arc_autopilot_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

