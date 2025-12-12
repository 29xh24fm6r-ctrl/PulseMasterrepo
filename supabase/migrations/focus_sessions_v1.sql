-- Focus Sessions Table
-- supabase/migrations/focus_sessions_v1.sql

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('single_task', 'power_hour')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  work_item_ids text[] NOT NULL DEFAULT '{}',
  completed_count int NOT NULL DEFAULT 0,
  total_planned int NOT NULL DEFAULT 0,
  xp_awarded int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS focus_sessions_user_idx
  ON public.focus_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS focus_sessions_active_idx
  ON public.focus_sessions (user_id, ended_at)
  WHERE ended_at IS NULL;

-- RLS
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own focus sessions"
  ON public.focus_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus sessions"
  ON public.focus_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions"
  ON public.focus_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);



