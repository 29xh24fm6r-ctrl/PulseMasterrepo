-- Timeline Coach v1
-- supabase/migrations/20260120_timeline_coach_v1.sql

-- ============================================
-- TIMELINE PREFERENCE PROFILE
-- ============================================

CREATE TABLE IF NOT EXISTS public.timeline_preference_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  last_refreshed_at timestamptz NOT NULL DEFAULT now(),

  domain_weights jsonb,           -- { work: 0.8, relationships: 1.0, health: 0.9, finance: 0.7, self_respect: 1.0 }
  risk_tolerance jsonb,           -- { work_risk: 0.4, financial_risk: 0.3, relational_risk: 0.1, health_risk: 0.2 }
  time_preferences jsonb,         -- e.g. { prefers_short_term_wins: 0.3, long_term_build: 0.9 }
  comfort_zones jsonb,            -- patterns like "habit intensity", "max push days", etc.
  sacrifice_preferences jsonb,    -- what they are willing / unwilling to sacrifice

  summary text,                   -- human language: "What I usually want futures to look like"

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_preference_profile_user
  ON public.timeline_preference_profile (user_id);

-- ============================================
-- TIMELINE DECISIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.timeline_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  run_id uuid REFERENCES simulation_runs(id) ON DELETE SET NULL,
  chosen_timeline_id uuid REFERENCES simulation_timelines(id) ON DELETE SET NULL,

  horizon_days int NOT NULL,          -- usually 30 or 90
  label text,                         -- e.g. 'Q1 Push with Guardrails', 'Relationship Repair Season'
  rationale text,                     -- short narrative of why this was chosen

  perceived_benefits jsonb,           -- what user/coach believes this path gives
  perceived_costs jsonb,              -- tradeoffs user is accepting

  confidence numeric,                 -- 0..1
  season_start date,
  season_end date,

  is_current boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_timeline_decisions_user
  ON public.timeline_decisions (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_timeline_decisions_current
  ON public.timeline_decisions (user_id, is_current)
  WHERE is_current = true;

-- ============================================
-- TIMELINE COMMITMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.timeline_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  decision_id uuid NOT NULL REFERENCES timeline_decisions(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  kind text NOT NULL,                 -- 'habit', 'constraint', 'focus_area', 'guardrail'
  label text NOT NULL,                -- '3 deep work blocks per week', 'No late-night doomscrolling Sun–Thu'
  description text,

  config jsonb,                       -- structured representation: thresholds, days, duration, etc.
  domain text,                        -- 'work', 'health', 'relationships', etc.

  is_active boolean NOT NULL DEFAULT true,
  broken_count int NOT NULL DEFAULT 0,
  upheld_count int NOT NULL DEFAULT 0,
  last_evaluated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_timeline_commitments_user
  ON public.timeline_commitments (user_id);

CREATE INDEX IF NOT EXISTS idx_timeline_commitments_decision
  ON public.timeline_commitments (decision_id);

-- ============================================
-- TIMELINE REFLECTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.timeline_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  decision_id uuid NOT NULL REFERENCES timeline_decisions(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  period_start date,
  period_end date,

  felt_outcome_summary text,      -- how this season actually felt
  alignment_change numeric,       -- -1..1, did this bring them closer/farther from values/identity
  satisfaction_score numeric,     -- 0..1
  regrets jsonb,                  -- { items: [...] }
  surprises jsonb,                -- { positive: [...], negative: [...] }

  lessons jsonb                   -- structured: what to prefer/avoid in future timeline choices
);

CREATE INDEX IF NOT EXISTS idx_timeline_reflections_user
  ON public.timeline_reflections (user_id, created_at);


