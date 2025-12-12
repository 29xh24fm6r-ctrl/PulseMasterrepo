-- What-If Replay Mode v1 - Alternate Timeline Simulator
-- supabase/migrations/20260120_what_if_replay_mode_v1.sql

-- ============================================
-- WHAT-IF SCENARIOS (Defines a What-If Branch)
-- ============================================

CREATE TABLE IF NOT EXISTS public.what_if_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  label text NOT NULL,            -- "What if I left OGB last year?"
  description text,

  origin_type text NOT NULL,      -- 'council_session', 'dossier', 'manual'
  origin_id uuid,                 -- council_sessions.id OR council_decision_dossiers.id

  anchor_time timestamptz,        -- when the fork hypothetically happens/happened
  timescale text,                 -- 'month', 'quarter', 'year', 'multi_year'

  base_assumption text,           -- "What actually happened"
  alternate_assumption text,      -- "Alternate choice: leave OGB in Jan 2025"

  parameters jsonb,               -- optional knobs (risk level, effort, etc.)

  status text NOT NULL DEFAULT 'draft' -- 'draft', 'ready', 'archived'
);

CREATE INDEX IF NOT EXISTS idx_what_if_scenarios_user_time
  ON public.what_if_scenarios (user_id, created_at DESC);

-- ============================================
-- WHAT-IF RUNS (Each Simulation Run)
-- ============================================

CREATE TABLE IF NOT EXISTS public.what_if_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES what_if_scenarios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  mode text NOT NULL,               -- 'retro' (past fork) or 'prospective' (future fork)
  horizon text NOT NULL,            -- '6_months', '1_year', '3_years', '5_years'

  baseline_timeline jsonb,          -- summary of "as is" trajectory
  alternate_timeline jsonb,         -- summary of alternate path

  deltas jsonb,                     -- differences across domains
  meta jsonb                        -- extra metadata (seeds, configuration)
);

CREATE INDEX IF NOT EXISTS idx_what_if_runs_scenario
  ON public.what_if_runs (scenario_id);

CREATE INDEX IF NOT EXISTS idx_what_if_runs_user_time
  ON public.what_if_runs (user_id, created_at DESC);

-- ============================================
-- WHAT-IF OUTCOMES (Human-Friendly Narrative)
-- ============================================

CREATE TABLE IF NOT EXISTS public.what_if_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES what_if_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  narrative_baseline text,          -- story of baseline path
  narrative_alternate text,         -- story of alternate path

  metrics_baseline jsonb,           -- { income, role, relationship_quality, health_score, etc. }
  metrics_alternate jsonb,

  highlight_differences jsonb       -- bullet-style "here's what meaningfully changes"
);

CREATE INDEX IF NOT EXISTS idx_what_if_outcomes_run
  ON public.what_if_outcomes (run_id);


