-- 20251217_job_queue_events_normalize_ts.sql
-- Ensure ts column has proper defaults and constraints

alter table public.job_queue_events
  alter column ts set default now();

alter table public.job_queue_events
  alter column ts set not null;

create index if not exists job_queue_events_job_ts_idx
  on public.job_queue_events (job_id, ts desc);

