-- Conscious Workspace v2 + Inner Monologue v1
-- supabase/migrations/20260120_conscious_workspace_v2_inner_monologue_v1.sql

-- ============================================
-- ALTER workspace_state
-- ============================================

ALTER TABLE public.workspace_state
ADD COLUMN IF NOT EXISTS narrative_chapter_id uuid,
ADD COLUMN IF NOT EXISTS narrative_logline text,
ADD COLUMN IF NOT EXISTS key_tensions jsonb,      -- [{ label, pressure, details }]
ADD COLUMN IF NOT EXISTS key_opportunities jsonb, -- [{ label, attractiveness, details }]
ADD COLUMN IF NOT EXISTS wisdom_summary text,     -- short "what usually works now"
ADD COLUMN IF NOT EXISTS ethical_alert boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ethical_notes text;

-- ============================================
-- ALTER workspace_threads
-- ============================================

ALTER TABLE public.workspace_threads
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS carry_forward boolean DEFAULT true,   -- whether to keep across days if unresolved
ADD COLUMN IF NOT EXISTS last_evaluated_at timestamptz,
ADD COLUMN IF NOT EXISTS wisdom_tags text[],                   -- 'avoid_overcommit', 'protect_relationship', etc.
ADD COLUMN IF NOT EXISTS risk_flags jsonb;                     -- [{ label, severity, details }]

-- ============================================
-- workspace_focus_sessions
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  state_date date NOT NULL,                -- date of workspace_state

  thread_ids uuid[],                       -- threads in focus this session
  focus_mode text,                         -- 'deep_work', 'review', 'planning', 'relationship', etc.
  summary text,                            -- what Pulse tried to do mentally
  outcome jsonb,                           -- { resolvedThreadIds, newThreadsCreated, notes }

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_focus_sessions_user_time
  ON public.workspace_focus_sessions (user_id, started_at);

-- ============================================
-- inner_monologue_entries
-- ============================================

CREATE TABLE IF NOT EXISTS public.inner_monologue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,          -- 'brainstem_daily', 'brainstem_weekly', 'monitor', 'coach_reflection', etc.
  state_date date,               -- optional: which day's workspace this relates to
  thread_ids uuid[],             -- which workspace threads this thought relates to (if any),

  kind text NOT NULL,            -- 'observation', 'question', 'hypothesis', 'worry', 'plan', 'meta'
  importance numeric NOT NULL DEFAULT 0.5,   -- 0..1
  content text NOT NULL,         -- natural-language internal thought
  annotations jsonb,             -- structured tags: { narrativeThemes, risks, roles, etc. }

  created_from jsonb             -- optional: references to experience_events, predictions, etc.
);

CREATE INDEX IF NOT EXISTS idx_inner_monologue_user_time
  ON public.inner_monologue_entries (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_inner_monologue_state_date
  ON public.inner_monologue_entries (user_id, state_date);

-- ============================================
-- conscious_insights
-- ============================================

CREATE TABLE IF NOT EXISTS public.conscious_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  generated_at timestamptz NOT NULL DEFAULT now(),
  state_date date,                      -- optional
  source text NOT NULL,                 -- 'inner_monologue', 'weekly_brain_loop', etc.

  importance numeric NOT NULL DEFAULT 0.5,  -- 0..1
  urgency numeric NOT NULL DEFAULT 0.5,     -- 0..1
  domain text,                              -- 'work', 'relationship', 'health', 'finance', 'self', etc.

  title text NOT NULL,
  summary text NOT NULL,                    -- 1–3 sentence explanation
  suggested_action text,                    -- optional: "What Pulse thinks you could do"
  linked_thread_ids uuid[],                -- workspace threads this insight touches
  linked_event_ids uuid[],                 -- experience_events or life_events

  delivered_at timestamptz,                -- when actually shown to user
  dismissed_at timestamptz,
  user_feedback text,                      -- 'helpful', 'not helpful', etc.

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conscious_insights_user_time
  ON public.conscious_insights (user_id, generated_at);

CREATE INDEX IF NOT EXISTS idx_conscious_insights_undelivered
  ON public.conscious_insights (user_id, delivered_at, dismissed_at)
  WHERE delivered_at IS NULL AND dismissed_at IS NULL;


