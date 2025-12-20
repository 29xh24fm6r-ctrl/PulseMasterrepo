-- 20251220_wisdom_refresh_runs.sql
begin;

create table if not exists public.wisdom_refresh_runs (
  user_id text primary key,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists wisdom_refresh_runs_last_run_at_idx
  on public.wisdom_refresh_runs (last_run_at desc);

commit;

