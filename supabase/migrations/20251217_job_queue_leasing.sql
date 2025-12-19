-- 20251217_job_queue_leasing.sql
-- Add leasing columns and indexes for atomic job claiming

alter table public.job_queue
  add column if not exists locked_at timestamptz null,
  add column if not exists locked_by text null,
  add column if not exists priority int not null default 0;

create index if not exists job_queue_pick_idx
  on public.job_queue (user_id, status, run_at, priority, created_at);

create index if not exists job_queue_lock_idx
  on public.job_queue (locked_at);

