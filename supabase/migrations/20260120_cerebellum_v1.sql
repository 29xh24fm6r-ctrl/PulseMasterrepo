-- Cerebellum v1: Automatic Routines & Motor Control
-- supabase/migrations/20260120_cerebellum_v1.sql

-- ============================================
-- MOTOR ROUTINES
-- ============================================

CREATE TABLE IF NOT EXISTS public.motor_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  key text,                        -- optional stable identifier ('weekly_planning', 'crm_sync', etc.)
  name text NOT NULL,              -- human-friendly name
  description text,

  domain text,                     -- 'work', 'relationships', 'health', 'finance', 'pulse_maintenance', etc.
  category text,                   -- 'review', 'sync', 'planning', 'cleanup', 'admin', 'relationship_touch'

  source text,                     -- 'system_default', 'autopilot_learned', 'user_defined', etc.
  status text NOT NULL DEFAULT 'active',  -- 'active', 'paused', 'deprecated'

  config jsonb,                    -- general configuration (parameters, options)
  last_compiled_at timestamptz     -- last time routine was "compiled" into steps
);

CREATE INDEX IF NOT EXISTS idx_motor_routines_user
  ON public.motor_routines (user_id, status);

CREATE INDEX IF NOT EXISTS idx_motor_routines_key
  ON public.motor_routines (user_id, key) WHERE key IS NOT NULL;

-- ============================================
-- MOTOR ROUTINE STEPS
-- ============================================

CREATE TABLE IF NOT EXISTS public.motor_routine_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES motor_routines(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  step_index int NOT NULL,         -- order of execution (for now: linear; later: branching)
  kind text NOT NULL,              -- 'task_create', 'notification_send', 'email_template', 'api_call', 'autopilot_run', etc.
  label text,                      -- "Create weekly planning tasks", etc.

  params jsonb,                    -- typed parameters for this step
  depends_on int[],                -- step_index dependencies (for future parallel/branch logic)
  error_policy text DEFAULT 'continue', -- 'continue', 'abort', 'retry_later'
  retry_config jsonb               -- { maxRetries, backoffMs } etc.
);

CREATE INDEX IF NOT EXISTS idx_motor_routine_steps_routine
  ON public.motor_routine_steps (routine_id, step_index);

-- ============================================
-- MOTOR ROUTINE TRIGGERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.motor_routine_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES motor_routines(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  trigger_type text NOT NULL,       -- 'time', 'event', 'state'
  schedule text,                    -- for 'time': cron/rrule or simplified spec
  event_filter jsonb,               -- for 'event': { source: 'email', conditions: {...} }
  state_condition jsonb,            -- for 'state': { emotion: 'overwhelmed', timeOfDay: 'evening', etc. }

  enabled boolean NOT NULL DEFAULT true,
  last_fired_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_motor_routine_triggers_user
  ON public.motor_routine_triggers (user_id, enabled);

CREATE INDEX IF NOT EXISTS idx_motor_routine_triggers_routine
  ON public.motor_routine_triggers (routine_id, enabled);

-- ============================================
-- MOTOR ROUTINE RUNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.motor_routine_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES motor_routines(id) ON DELETE CASCADE,
  trigger_id uuid REFERENCES motor_routine_triggers(id) ON DELETE SET NULL,

  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,

  status text NOT NULL DEFAULT 'running',  -- 'running', 'completed', 'failed', 'partial', 'cancelled'
  error_summary text,

  steps_executed int DEFAULT 0,
  steps_total int DEFAULT 0,

  context jsonb                       -- snapshot of relevant context when started
);

CREATE INDEX IF NOT EXISTS idx_motor_routine_runs_user
  ON public.motor_routine_runs (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_motor_routine_runs_routine
  ON public.motor_routine_runs (routine_id, started_at DESC);

-- ============================================
-- MOTOR ROUTINE METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS public.motor_routine_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES motor_routines(id) ON DELETE CASCADE,

  updated_at timestamptz NOT NULL DEFAULT now(),

  executions_total int NOT NULL DEFAULT 0,
  executions_success int NOT NULL DEFAULT 0,
  executions_partial int NOT NULL DEFAULT 0,
  executions_failed int NOT NULL DEFAULT 0,

  avg_duration_ms numeric,
  avg_steps_executed numeric,

  user_feedback jsonb,               -- { ratings: [...], notes: [...] }
  optimization_notes jsonb           -- Cerebellum's own learned tweaks
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_motor_routine_metrics_user_routine
  ON public.motor_routine_metrics (user_id, routine_id);


