-- Conscious Workspace v1 + Daily Multi-Timeline Execution Layer v1
-- supabase/migrations/20260120_conscious_workspace_daily_multitimeline_v1.sql

-- ============================================
-- WORKSPACE FOCUS STATES
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_focus_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_timeline_id uuid REFERENCES destiny_timelines(id),
  active_branch_run_id uuid REFERENCES branch_simulation_runs(id),
  focus_mode text NOT NULL DEFAULT 'normal',  -- 'normal','deep_work','recovery','sales_push','family','custom'
  focus_tags text[] DEFAULT '{}',             -- extra tags, e.g. ['pipeline','health']
  applied_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_focus_states_user_applied
  ON public.workspace_focus_states (user_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_focus_states_user_active
  ON public.workspace_focus_states (user_id, expires_at) WHERE expires_at IS NULL OR expires_at > now();

-- ============================================
-- DAILY TIMELINE VIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS public.daily_timeline_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  timeline_id uuid REFERENCES destiny_timelines(id),
  branch_run_id uuid REFERENCES branch_simulation_runs(id),
  mode text NOT NULL DEFAULT 'day_projection', -- future/retro view modes
  summary text,                                -- short "what this day looks like from this path"
  key_metrics jsonb,                            -- { focus_hours, sales_moves, family_time, stress_estimate, ... }
  suggested_actions jsonb,                      -- [{id, label, type, linked_task_id, etc.}]
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date, timeline_id, branch_run_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_daily_timeline_views_user_date
  ON public.daily_timeline_views (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_timeline_views_timeline
  ON public.daily_timeline_views (timeline_id) WHERE timeline_id IS NOT NULL;

-- ============================================
-- WORKSPACE DAY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_day_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  chosen_focus_state_id uuid REFERENCES workspace_focus_states(id),
  executed_timeline_id uuid REFERENCES destiny_timelines(id),  -- the path we mostly followed (if any)
  summary text,                              -- daily reflection summary (automatic or manual)
  key_signals jsonb,                         -- e.g. { completed_focus_blocks: 3, major_deal_moves: 2, family_time_hours: 1.5 }
  alignment_delta numeric(4,2),             -- change in self_alignment (from Self Mirror)
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_workspace_day_log_user_date
  ON public.workspace_day_log (user_id, date DESC);


