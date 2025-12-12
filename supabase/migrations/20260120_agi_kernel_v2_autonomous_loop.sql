-- AGI Kernel v2 - Autonomous Cognitive Loop (Default Mode Network)
-- supabase/migrations/20260120_agi_kernel_v2_autonomous_loop.sql

-- ============================================
-- COGNITIVE RUNS (One Full Execution of the Loop)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cognitive_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,

  kind text NOT NULL,                  -- 'light', 'nightly', 'weekly_deep'
  trigger_type text NOT NULL,          -- 'schedule', 'manual', 'event'
  trigger_source text,                 -- 'brainstem_daily', 'brainstem_weekly', 'error_recovery', etc.
  trigger_reference jsonb,             -- arbitrary context (date, event id, etc.)

  status text NOT NULL DEFAULT 'running', -- 'running', 'completed', 'partial', 'failed', 'skipped'
  summary text,
  overall_confidence numeric,          -- 0..1 confidence in insights/updates
  safety_flags jsonb                   -- { escalated: bool, reasons: [...], ... }
);

CREATE INDEX IF NOT EXISTS idx_cognitive_runs_user_time
  ON public.cognitive_runs (user_id, started_at DESC);

-- ============================================
-- COGNITIVE PHASES (Tracks Each Phase Within a Run)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cognitive_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES cognitive_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  phase_name text NOT NULL,            -- 'memory_sweep', 'model_reconciliation', 'pattern_mining', 'forecasting', 'update_planning', 'self_reflection'
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,

  status text NOT NULL DEFAULT 'running', -- 'running', 'completed', 'partial', 'skipped', 'failed'
  details jsonb,                      -- additional metrics / notes
  error_summary text
);

CREATE INDEX IF NOT EXISTS idx_cognitive_phases_run
  ON public.cognitive_phases (run_id, phase_name);

-- ============================================
-- COGNITIVE INSIGHTS (Concrete Insights Produced)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cognitive_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES cognitive_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  source_phase text NOT NULL,          -- which phase produced this
  category text NOT NULL,              -- 'pattern', 'risk', 'opportunity', 'anomaly', 'alignment', 'efficiency'
  label text NOT NULL,
  description text NOT NULL,

  importance numeric NOT NULL,         -- 0..1
  confidence numeric NOT NULL,         -- 0..1
  scope text,                          -- 'work', 'relationships', 'health', 'finance', 'meta', etc.

  related_entities jsonb,              -- { tasks: [...], deals: [...], people: [...], time_windows: [...] }
  recommended_actions jsonb            -- optional: suggestions, not yet committed
);

CREATE INDEX IF NOT EXISTS idx_cognitive_insights_user_time
  ON public.cognitive_insights (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cognitive_insights_category
  ON public.cognitive_insights (user_id, category, created_at DESC);

-- ============================================
-- COGNITIVE HYPOTHESES (Hypotheses About Patterns/Causes)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cognitive_hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  label text NOT NULL,
  description text NOT NULL,           -- explanation of the hypothesis
  status text NOT NULL DEFAULT 'active', -- 'active', 'confirmed', 'rejected', 'dormant'

  evidence_for jsonb,                  -- e.g. [{ source: 'emotion', weight: 0.3, note: '...' }, ...]
  evidence_against jsonb,

  confidence numeric NOT NULL DEFAULT 0.5, -- 0..1
  last_evaluated_at timestamptz,
  tags text[]
);

CREATE INDEX IF NOT EXISTS idx_cognitive_hypotheses_user
  ON public.cognitive_hypotheses (user_id, updated_at DESC);

-- ============================================
-- COGNITIVE UPDATE ACTIONS (Structured Self-Update & Action Requests)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cognitive_update_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES cognitive_runs(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  target_system text NOT NULL,         -- 'meta_planner', 'cerebellum', 'autopilot', 'coaches', 'ui', 'identity', 'destiny', etc.
  action_kind text NOT NULL,           -- 'refine_policy', 'adjust_priority', 'suggest_routine', 'create_prompt', 'update_model', 'escalate_to_user'
  payload jsonb NOT NULL,              -- structured content for that system

  autonomy_level text NOT NULL,        -- 'auto_safe', 'needs_confirmation', 'coach_review'
  importance numeric NOT NULL,         -- 0..1
  confidence numeric NOT NULL,         -- 0..1
  safety_risk numeric NOT NULL,        -- 0..1

  status text NOT NULL DEFAULT 'pending', -- 'pending', 'applied', 'skipped', 'rejected'
  status_details jsonb
);

CREATE INDEX IF NOT EXISTS idx_cognitive_update_actions_user_status
  ON public.cognitive_update_actions (user_id, status, created_at DESC);

-- ============================================
-- COGNITIVE SELF REFLECTIONS (Pulse's Own Internal Self-Reflection Log)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cognitive_self_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES cognitive_runs(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  perspective text NOT NULL,          -- 'system', 'user_centric', 'meta'
  content text NOT NULL,              -- internal narrative; not 1:1 user-facing
  referenced_subsystems text[],       -- which subsystems were involved
  referenced_issues jsonb,            -- links to errors, conflicts, patterns
  followup_hints jsonb                -- hints for future loops / coaches
);

CREATE INDEX IF NOT EXISTS idx_cognitive_self_reflections_user_time
  ON public.cognitive_self_reflections (user_id, created_at DESC);


