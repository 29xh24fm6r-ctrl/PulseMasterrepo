begin;

-- 1) Add trace_id to execution_runs and execution_logs
alter table public.execution_runs
  add column if not exists trace_id uuid null;

alter table public.execution_logs
  add column if not exists trace_id uuid null;

-- 2) Backfill: best effort (runs get their own trace; logs will be null until new writes)
update public.execution_runs
set trace_id = gen_random_uuid()
where trace_id is null;

-- 3) Indexes for trace lookups
create index if not exists idx_execution_runs_trace
  on public.execution_runs (trace_id, started_at desc);

create index if not exists idx_execution_logs_trace
  on public.execution_logs (trace_id, created_at desc);

commit;
