-- Meta-Planner / Conflict Resolver v1
-- supabase/migrations/20260120_meta_planner_v1.sql

-- ============================================
-- PLANNING SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.planning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  kind text NOT NULL,                 -- 'daily', 'weekly', 'conflict_resolution', 'ad_hoc'
  trigger_source text,                -- 'brainstem_weekly', 'user_request', 'conscious_conflict', etc.
  context jsonb,                      -- { frameId, date, conflictIds, etc. }

  summary text,                       -- human summary of what was being planned
  alignment_score numeric,            -- how aligned final plan is with destiny/values (0..1)
  stress_budget numeric,              -- allowed stress/effort for period (0..1)
  energy_budget numeric               -- somatic capacity (0..1)
);

CREATE INDEX IF NOT EXISTS idx_planning_sessions_user
  ON public.planning_sessions (user_id, created_at DESC);

-- ============================================
-- PLANNING CONSTRAINTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.planning_constraints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  kind text NOT NULL,                -- 'time', 'energy', 'values', 'destiny', 'social', 'culture', 'hard_deadline'
  label text NOT NULL,
  description text,
  payload jsonb                      -- structured data (deadline dates, hours available, no-go windows, etc.)
);

CREATE INDEX IF NOT EXISTS idx_planning_constraints_session
  ON public.planning_constraints (session_id);

-- ============================================
-- PLANNING DECISIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.planning_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  decision_kind text NOT NULL,       -- 'prioritize_task', 'defer_task', 'cancel_task', 'activate_routine', 'pause_routine', 'adjust_goal', etc.
  target_type text NOT NULL,         -- 'task', 'routine', 'project', 'timeline_arc', etc.
  target_id text,                    -- external id (taskId, routineId, projectId, etc.)

  priority numeric,                  -- 0..1 (for prioritization decisions)
  rationale text,                    -- human explanation

  applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  applied_result jsonb               -- status details after application
);

CREATE INDEX IF NOT EXISTS idx_planning_decisions_session
  ON public.planning_decisions (session_id);

CREATE INDEX IF NOT EXISTS idx_planning_decisions_user_applied
  ON public.planning_decisions (user_id, applied);

-- ============================================
-- PLANNING OVERRIDES
-- ============================================

CREATE TABLE IF NOT EXISTS public.planning_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  target_type text NOT NULL,         -- 'calendar_event', 'task', 'routine_trigger', etc.
  target_id text,                    -- underlying system id

  change_kind text NOT NULL,         -- 'reschedule', 'cancel', 'downgrade_priority', 'upgrade_priority', 'pause', etc.
  before_state jsonb,
  after_state jsonb,

  notes text
);

CREATE INDEX IF NOT EXISTS idx_planning_overrides_user
  ON public.planning_overrides (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_planning_overrides_session
  ON public.planning_overrides (session_id);


