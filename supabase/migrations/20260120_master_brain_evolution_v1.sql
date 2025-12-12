-- Master Brain Evolution Engine v1 - Self-Improvement & Evolution
-- supabase/migrations/20260120_master_brain_evolution_v1.sql

-- ============================================
-- SYSTEM IMPROVEMENT IDEAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_improvement_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,                  -- 'diagnostics' | 'user' | 'dev' | 'ai'
  title text NOT NULL,                   -- 'Make Boardroom Brain more discoverable'
  description text,
  module_id uuid REFERENCES system_modules(id),
  capability_id uuid REFERENCES system_capabilities(id),
  severity text,                         -- optional: 'low' | 'medium' | 'high'
  impact_area text,                      -- 'ux', 'performance', 'retention', 'accuracy', 'education'
  effort_estimate text,                  -- 'low', 'medium', 'high'
  status text NOT NULL DEFAULT 'backlog',-- 'backlog' | 'planned' | 'in_experiment' | 'done' | 'dropped'
  created_by text NOT NULL,              -- 'system' | 'user:<id>' | 'dev:<id>' | 'ai'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_improvement_ideas_module_status
  ON public.system_improvement_ideas (module_id, status);

-- ============================================
-- SYSTEM EXPERIMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                     -- 'Dashboard v3 layout test'
  hypothesis text NOT NULL,               -- 'If we simplify dashboard, engagement ↑'
  description text,
  idea_ids uuid[],                        -- array of related improvement_ideas
  target_metrics jsonb,                   -- ['dashboard_daily_opens', 'time_to_first_action']
  status text NOT NULL DEFAULT 'planned', -- 'planned' | 'running' | 'completed' | 'cancelled'
  created_by text not null,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_system_experiments_status
  ON public.system_experiments (status, created_at DESC);

-- ============================================
-- SYSTEM EXPERIMENT RUNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_experiment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES system_experiments(id) ON DELETE CASCADE,
  variant text NOT NULL,                   -- 'control', 'v1', 'v2', etc.
  parameters jsonb,                        -- description of what changed
  metrics_before jsonb,                    -- snapshot of key metrics pre-run
  metrics_after jsonb,                     -- snapshot after run
  result_summary text,                     -- high-level interpretation
  outcome text,                            -- 'improved', 'no_change', 'worse', 'inconclusive'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_experiment_runs_experiment
  ON public.system_experiment_runs (experiment_id, created_at DESC);

-- ============================================
-- SYSTEM CHANGELOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,                     -- 'Boardroom Brain added Decision Theater view'
  description text,
  module_id uuid REFERENCES system_modules(id),
  tags jsonb,                              -- ['ui', 'coach', 'performance']
  experiment_id uuid REFERENCES system_experiments(id),
  created_by text NOT NULL,                -- 'system' | 'dev:<id>' | 'ai'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_changelog_time
  ON public.system_changelog (created_at DESC);

-- ============================================
-- SYSTEM USER FEEDBACK
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES system_modules(id),
  capability_id uuid REFERENCES system_capabilities(id),
  context jsonb,                   -- where/when feedback happened
  rating integer,                  -- 1–5
  comment text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_user_feedback_module
  ON public.system_user_feedback (module_id, created_at DESC);


