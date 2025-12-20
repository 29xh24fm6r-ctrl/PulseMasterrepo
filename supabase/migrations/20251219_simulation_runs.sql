-- Simulation Runs Audit Table
-- supabase/migrations/20251219_simulation_runs.sql

create table if not exists public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  request_id text not null,
  route text not null,
  mode text not null,
  deal_id uuid null,
  path_ids text[] null,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'started',
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  duration_ms integer null,
  error text null,
  result jsonb null
);

create index if not exists simulation_runs_user_id_idx on public.simulation_runs(user_id);
create index if not exists simulation_runs_request_id_idx on public.simulation_runs(request_id);
create index if not exists simulation_runs_started_at_idx on public.simulation_runs(started_at desc);

