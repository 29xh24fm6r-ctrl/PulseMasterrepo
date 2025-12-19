-- 20251217_job_queue_idempotency_unique.sql
-- Unique index on idempotency_key to prevent duplicate job enqueues

-- Drop existing unique index if it exists (from previous migration)
DROP INDEX IF EXISTS public.uniq_job_queue_idempotency;

-- Create unique index on (user_id, idempotency_key) where idempotency_key is not null
-- This prevents duplicate jobs with the same idempotency key for the same user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_job_queue_idempotency
  ON public.job_queue (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

