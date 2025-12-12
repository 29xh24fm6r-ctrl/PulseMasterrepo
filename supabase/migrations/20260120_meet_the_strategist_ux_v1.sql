-- Meet the Strategist UX v1 - User-facing strategic briefing room
-- supabase/migrations/20260120_meet_the_strategist_ux_v1.sql

-- ============================================
-- STRATEGIST SESSIONS (Review Sessions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategist_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  status text NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'

  snapshot_id uuid REFERENCES strategic_state_snapshots(id) ON DELETE SET NULL,
  equilibrium_id uuid REFERENCES strategic_equilibria(id) ON DELETE SET NULL,

  intro_narrative text,
  key_points jsonb,            -- bullet-point summary of strategy
  user_reaction jsonb          -- sentiment / meta feedback
);

CREATE INDEX IF NOT EXISTS idx_strategist_sessions_user_time
  ON public.strategist_sessions (user_id, created_at DESC);

-- ============================================
-- STRATEGIC REVIEW EVENTS (What Was Shown)
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES strategist_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  event_type text NOT NULL,        -- 'equilibrium_summary', 'conflict', 'recommendation'
  ref_id uuid,                     -- e.g. strategic_conflicts.id or strategy_recommendations.id
  payload jsonb                    -- snapshot of what was shown
);

CREATE INDEX IF NOT EXISTS idx_strategic_review_events_user_session
  ON public.strategic_review_events (user_id, session_id);

-- ============================================
-- STRATEGY FEEDBACK (User Feedback)
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategy_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  recommendation_id uuid REFERENCES strategy_recommendations(id) ON DELETE SET NULL,
  session_id uuid REFERENCES strategist_sessions(id) ON DELETE SET NULL,

  reaction text NOT NULL,          -- 'accept', 'reject', 'modify', 'defer'
  notes text,
  prefs_patch jsonb                -- e.g. "less work push", "more relationship focus"
);

CREATE INDEX IF NOT EXISTS idx_strategy_feedback_user_time
  ON public.strategy_feedback (user_id, created_at DESC);


