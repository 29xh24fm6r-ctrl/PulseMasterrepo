-- 20251217_job_queue_events.sql
-- Job event logging table for observability

CREATE TABLE IF NOT EXISTS public.job_queue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_queue(id) ON DELETE CASCADE,
  
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_events_job_id
  ON public.job_queue_events (job_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_job_queue_events_level
  ON public.job_queue_events (level, ts DESC);

-- RLS (optional - events are append-only, users can read their own job events)
ALTER TABLE public.job_queue_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their own jobs"
  ON public.job_queue_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_queue jq
      WHERE jq.id = job_queue_events.job_id
        AND jq.user_id = public.current_user_row_id()
    )
  );

