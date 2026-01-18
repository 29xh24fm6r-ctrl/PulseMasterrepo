-- 20260103_job_queue_dlq.sql
begin;

alter table public.job_queue
add column if not exists attempts integer not null default 0,
add column if not exists last_error text,
add column if not exists failed_at timestamptz;

create index if not exists job_queue_failed_idx
  on public.job_queue (job_type, failed_at)
  where failed_at is not null;

commit;
