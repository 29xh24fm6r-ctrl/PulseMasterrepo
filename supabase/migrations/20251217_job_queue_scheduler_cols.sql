-- 20251217_job_queue_scheduler_cols.sql
-- Add scheduler columns: cost and lane

alter table public.job_queue
  add column if not exists cost int not null default 1,
  add column if not exists lane text not null default 'default';

-- Index for user concurrency checks
create index if not exists idx_job_queue_user_status
  on public.job_queue (user_id, status);

-- Index for lane-based priority ordering
create index if not exists idx_job_queue_lane_priority_run_at
  on public.job_queue (lane, priority, run_at, created_at)
  where status = 'queued';

