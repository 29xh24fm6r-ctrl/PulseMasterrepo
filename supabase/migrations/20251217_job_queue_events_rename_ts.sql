-- 20251217_job_queue_events_rename_ts.sql
-- Rename created_at to ts for consistency with API/UI

-- Rename column
ALTER TABLE public.job_queue_events
  RENAME COLUMN created_at TO ts;

-- Update indexes to use ts
DROP INDEX IF EXISTS idx_job_queue_events_job_id;
CREATE INDEX IF NOT EXISTS idx_job_queue_events_job_id
  ON public.job_queue_events (job_id, ts DESC);

DROP INDEX IF EXISTS idx_job_queue_events_level;
CREATE INDEX IF NOT EXISTS idx_job_queue_events_level
  ON public.job_queue_events (level, ts DESC);

