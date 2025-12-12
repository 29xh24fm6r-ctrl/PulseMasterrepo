-- Pulse Neocortex v1 - Backend Spec
-- supabase/migrations/20260120_neocortex_v1.sql

-- ============================================
-- CORTEX AREAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.cortex_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL, -- e.g. 'work', 'money', 'relationships'
  name text NOT NULL, -- 'Work Cortex'
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_cortex_areas_user ON public.cortex_areas (user_id);

-- ============================================
-- CORTEX EVENTS (Raw Ingest)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cortex_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_key text NOT NULL, -- 'work' etc
  source text NOT NULL, -- 'tasks', 'deals', 'calendar', 'email', 'notes'
  event_type text NOT NULL, -- 'TASK_COMPLETED', 'DEAL_STAGE_CHANGED', etc.
  event_time timestamptz NOT NULL,
  context_id text,    -- e.g. deal_id, task_id
  context_type text,  -- 'deal', 'task', 'meeting', 'note'
  payload jsonb,      -- raw details, smallish
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cortex_events_user_time
  ON public.cortex_events (user_id, event_time);
CREATE INDEX IF NOT EXISTS idx_cortex_events_user_type
  ON public.cortex_events (user_id, event_type);

-- ============================================
-- CORTEX SIGNALS (Derived Metrics)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cortex_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_key text NOT NULL, -- 'work'
  window_date date NOT NULL, -- daily window for v1
  scope text NOT NULL, -- 'global', 'deal', 'pipeline', 'task', 'meeting'
  scope_ref text,      -- e.g. deal_id, null for global
  key text NOT NULL,   -- 'deep_work_minutes', 'deal_velocity', etc.
  value_numeric double precision,
  value_json jsonb,
  sample_count int,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_key, window_date, scope, scope_ref, key)
);

CREATE INDEX IF NOT EXISTS idx_cortex_signals_user_date
  ON public.cortex_signals (user_id, window_date);

-- ============================================
-- CORTEX PATTERNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.cortex_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_key text NOT NULL,
  key text NOT NULL, -- 'monday_morning_deep_work', 'deal_slip_pattern'
  name text NOT NULL,
  description text,
  pattern_type text NOT NULL, -- 'time_series', 'correlation', 'sequence'
  signal_keys text[] NOT NULL, -- primary signals involved
  stats jsonb, -- e.g. { "mean": ..., "stddev": ..., "support": ... }
  examples jsonb, -- sample days/deals where this pattern occurs
  strength numeric, -- 0-1 or 0-100
  last_observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_key, key)
);

CREATE INDEX IF NOT EXISTS idx_cortex_patterns_user
  ON public.cortex_patterns (user_id);

-- ============================================
-- CORTEX SKILLS (Playbooks)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cortex_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_key text NOT NULL,
  key text NOT NULL, -- 'monday_pipeline_reset'
  name text NOT NULL,
  description text,
  trigger jsonb, -- conditions, schedule, thresholds
  steps jsonb,   -- ordered steps, referencing actions / tools
  derived_from_pattern_ids uuid[], -- patterns that inspired this skill
  usage_stats jsonb, -- e.g., { "times_suggested": 10, "times_run": 6 }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_key, key)
);

CREATE INDEX IF NOT EXISTS idx_cortex_skills_user
  ON public.cortex_skills (user_id);

-- ============================================
-- CORTEX PREDICTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.cortex_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_key text NOT NULL,
  kind text NOT NULL, -- 'risk', 'opportunity', 'forecast'
  target_scope text NOT NULL, -- 'day', 'deal', 'pipeline'
  target_ref text,    -- e.g. date, deal_id
  horizon text,       -- 'today', 'this_week', 'short_term'
  summary text NOT NULL,
  details jsonb,
  confidence numeric, -- 0-1
  pattern_ids uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cortex_predictions_user
  ON public.cortex_predictions (user_id, created_at);

-- ============================================
-- CORTEX ANOMALIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.cortex_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_key text NOT NULL,
  window_date date NOT NULL,
  scope text NOT NULL, -- 'global', 'deal', 'pipeline'
  scope_ref text,
  severity numeric, -- 0-1
  summary text NOT NULL,
  expected jsonb,
  observed jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cortex_anomalies_user
  ON public.cortex_anomalies (user_id, window_date);


