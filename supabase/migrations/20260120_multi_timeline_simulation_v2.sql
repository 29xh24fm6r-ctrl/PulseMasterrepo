-- Multi-Timeline Simulation v2
-- supabase/migrations/20260120_multi_timeline_simulation_v2.sql

-- ============================================
-- SIMULATION RUNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  horizon_days int NOT NULL,            -- e.g. 7, 30, 90
  seed_date date NOT NULL,              -- date from which simulation begins
  description text,                     -- e.g. 'weekly_brain_loop_multitimeline'

  context_snapshot jsonb,               -- compressed snapshot of starting state: goals, somatic, social, narrative, etc.

  status text NOT NULL DEFAULT 'completed', -- 'pending', 'running', 'completed', 'failed'
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_user_time
  ON public.simulation_runs (user_id, created_at);

-- ============================================
-- SIMULATION POLICIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.simulation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE, -- null = global policy template

  key text NOT NULL,                  -- 'baseline', 'high_discipline', 'relationship_first', etc.
  name text NOT NULL,
  description text,
  domain text,                        -- 'global', 'work', 'health', 'relationships', etc.

  policy_spec jsonb,                  -- structured description of rules (habit intensities, constraints, changes)

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_simulation_policies_user
  ON public.simulation_policies (user_id);

-- Seed global policies
INSERT INTO public.simulation_policies (user_id, key, name, description, domain, policy_spec)
VALUES
  (NULL, 'baseline', 'Baseline Trajectory', 'Continue current patterns and behaviors', 'global', '{"intensity": "current", "changes": []}'::jsonb),
  (NULL, 'high_discipline', 'High Discipline', 'Maximum focus on goals, strict habit adherence, minimal distractions', 'global', '{"intensity": "high", "habits": "strict", "distractions": "minimal"}'::jsonb),
  (NULL, 'relationship_first', 'Relationship First', 'Prioritize relationships and social connections over work', 'relationships', '{"work_intensity": "reduced", "relationship_focus": "high"}'::jsonb),
  (NULL, 'health_recovery', 'Health Recovery', 'Focus on rest, recovery, and health maintenance', 'health', '{"work_intensity": "low", "rest_priority": "high", "health_focus": "maximum"}'::jsonb),
  (NULL, 'sales_push', 'Sales Push', 'Aggressive focus on revenue, deals, and business growth', 'work', '{"work_intensity": "maximum", "sales_focus": "high", "relationship_focus": "reduced"}'::jsonb),
  (NULL, 'sobriety_boundary', 'Sobriety Boundary', 'Maintain strict boundaries around sobriety and recovery', 'health', '{"sobriety_focus": "maximum", "boundaries": "strict"}'::jsonb)
ON CONFLICT (user_id, key) DO NOTHING;

-- ============================================
-- SIMULATION TIMELINES
-- ============================================

CREATE TABLE IF NOT EXISTS public.simulation_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  policy_key text NOT NULL,          -- 'baseline', 'high_discipline', ...
  label text,                        -- human-facing label
  narrative_label text,              -- e.g. 'Slow burn toward burnout', 'Comeback arc'

  score_overall numeric,             -- 0..1: overall evaluation
  score_work numeric,
  score_health numeric,
  score_relationships numeric,
  score_finance numeric,
  score_self_respect numeric,
  score_alignment numeric,           -- Identity/values alignment
  score_burnout_risk numeric,        -- 0..1

  summary text,                      -- 1–3 sentence overview

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_timelines_user_run
  ON public.simulation_timelines (user_id, run_id);

-- ============================================
-- SIMULATION STEPS
-- ============================================

CREATE TABLE IF NOT EXISTS public.simulation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES simulation_timelines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  step_index int NOT NULL,           -- 0..N, relative
  step_date date,                    -- optional actual date (seed_date + step_index)
  horizon_label text,                -- 'day_1', 'day_7', 'week_1', 'month_1', etc.

  metrics jsonb,                     -- { work_score, health_score, relationship_score, finance_score, somatic_scores, etc. }
  events jsonb,                      -- high-level "simulated events" (promotions, conflicts, wins, etc.)
  narrative_snippet text,            -- short story fragment ("this week you...")

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_steps_timeline
  ON public.simulation_steps (timeline_id, step_index);

-- ============================================
-- SIMULATION OUTCOMES
-- ============================================

CREATE TABLE IF NOT EXISTS public.simulation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  generated_at timestamptz NOT NULL DEFAULT now(),

  comparison_summary text,           -- narrative: "Across 4 futures, here's the pattern..."
  best_timelines jsonb,              -- [{ timelineId, label, reasons }]
  worst_timelines jsonb,             -- [{ timelineId, label, risks }]
  key_tradeoffs jsonb,               -- e.g. { "work_vs_health": "...", ... }

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_outcomes_user_run
  ON public.simulation_outcomes (user_id, run_id);

-- ============================================
-- WORKSPACE TIMELINE LINKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_timeline_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  state_date date NOT NULL,               -- which workspace day this link applies to
  thread_id uuid NOT NULL,                -- workspace_threads.id
  timeline_id uuid NOT NULL REFERENCES simulation_timelines(id) ON DELETE CASCADE,

  projected_impact jsonb,                 -- { horizon: '30d', direction: 'better'|'worse', domainScores, description }
  risk_if_ignored jsonb,                  -- { severity: 0..1, narrative: 'If you ignore this thread...' }
  opportunity_if_addressed jsonb,         -- { gain_score: 0..1, narrative: 'If you move on this...' }

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_timeline_links_user_state
  ON public.workspace_timeline_links (user_id, state_date);

CREATE INDEX IF NOT EXISTS idx_workspace_timeline_links_thread
  ON public.workspace_timeline_links (user_id, thread_id);


