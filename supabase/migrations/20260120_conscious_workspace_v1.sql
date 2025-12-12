-- Pulse Global Conscious Workspace v1
-- supabase/migrations/20260120_conscious_workspace_v1.sql

-- ============================================
-- WORKSPACE STATE
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_date date NOT NULL,               -- usually today
  focus_mode text NOT NULL DEFAULT 'normal',  -- 'normal', 'deep_work', 'recovery', 'fire_fighting'
  focus_theme text,                       -- e.g. 'Close deals', 'Family day', etc.
  active_thread_ids uuid[],              -- pointers into workspace_threads
  attention_budget_minutes int,          -- how much conscious attention left today
  attention_load numeric,                -- 0-1, how "full" the workspace is
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, state_date)
);

CREATE INDEX IF NOT EXISTS idx_workspace_state_user_date
  ON public.workspace_state (user_id, state_date);

-- ============================================
-- WORKSPACE THREADS
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,          -- 'deal', 'task', 'project', 'relationship', 'problem', 'insight', 'meta'
  source text,                 -- 'prefrontal', 'cortex', 'emotion', 'user', etc.
  ref_type text,               -- 'deal', 'task', 'contact', 'goal', 'note', etc.
  ref_id text,                 -- foreign key id in that domain (string)
  title text NOT NULL,         -- short name: 'Hard AF – Close DD', 'Sebrina tension', etc.
  summary text,                -- 1–3 sentence description
  importance numeric NOT NULL DEFAULT 0.5,  -- 0–1
  urgency numeric NOT NULL DEFAULT 0.5,     -- 0–1
  emotional_valence numeric,               -- -1 (negative) to 1 (positive)
  attention_cost_minutes int,              -- rough guess of attention needed to "resolve"
  status text NOT NULL DEFAULT 'active',   -- 'active', 'snoozed', 'resolved', 'archived'
  snooze_until timestamptz,
  last_touched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_threads_user_status
  ON public.workspace_threads (user_id, status, last_touched_at);

CREATE INDEX IF NOT EXISTS idx_workspace_threads_user_ref
  ON public.workspace_threads (user_id, ref_type, ref_id);

-- ============================================
-- WORKSPACE INTERRUPTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_interrupts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,           -- 'cortex_anomaly', 'emotion', 'calendar', 'system'
  severity numeric NOT NULL,      -- 0–1
  summary text NOT NULL,
  details jsonb,
  resolved_at timestamptz,
  resolution_action text          -- 'acknowledged', 'converted_to_thread', 'ignored', etc.
);

CREATE INDEX IF NOT EXISTS idx_workspace_interrupts_user
  ON public.workspace_interrupts (user_id, triggered_at);

CREATE INDEX IF NOT EXISTS idx_workspace_interrupts_resolved
  ON public.workspace_interrupts (user_id, resolved_at) WHERE resolved_at IS NULL;


