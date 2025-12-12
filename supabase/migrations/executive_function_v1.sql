-- Executive Function Events Table
-- supabase/migrations/executive_function_v1.sql

CREATE TABLE IF NOT EXISTS public.executive_function_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'micro_step_completed',
    'task_avoided',
    'task_postponed',
    'session_interrupted',
    'ef_sequence_completed',
    'autonomous_replan_triggered'
  )),
  work_item_id text,
  parent_task_id text,
  session_id uuid REFERENCES focus_sessions(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ef_events_user_idx
  ON public.executive_function_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ef_events_type_idx
  ON public.executive_function_events (user_id, event_type, occurred_at DESC);

-- RLS
ALTER TABLE public.executive_function_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own EF events"
  ON public.executive_function_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own EF events"
  ON public.executive_function_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);



