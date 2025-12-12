-- Pulse Cortex Trace Table
-- supabase/migrations/cortex_trace_v1.sql

CREATE TABLE IF NOT EXISTS public.pulse_cortex_trace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN (
    'cortex',
    'autonomy',
    'executive',
    'third_brain',
    'emotion',
    'longitudinal',
    'mesh'
  )),
  level text NOT NULL CHECK (level IN ('info', 'debug', 'warn', 'error')),
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  context jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cortex_trace_user_idx
  ON public.pulse_cortex_trace (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS cortex_trace_source_idx
  ON public.pulse_cortex_trace (user_id, source, timestamp DESC);

CREATE INDEX IF NOT EXISTS cortex_trace_level_idx
  ON public.pulse_cortex_trace (user_id, level, timestamp DESC);

-- RLS
ALTER TABLE public.pulse_cortex_trace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trace entries"
  ON public.pulse_cortex_trace
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trace entries"
  ON public.pulse_cortex_trace
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);



