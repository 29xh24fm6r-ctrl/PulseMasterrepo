-- Simulation Fix Plans Table
-- supabase/migrations/20251219_simulation_fix_plans.sql

create table if not exists public.simulation_fix_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  request_id text not null,
  step_id text not null,
  step_title text null,
  status text not null default 'created', -- created|generated|error
  created_at timestamptz not null default now(),
  generated_at timestamptz null,
  error text null,
  plan_markdown text null,
  patch_json jsonb null
);

create index if not exists simulation_fix_plans_user_id_idx on public.simulation_fix_plans(user_id);
create index if not exists simulation_fix_plans_run_id_idx on public.simulation_fix_plans(run_id);
create index if not exists simulation_fix_plans_request_id_idx on public.simulation_fix_plans(request_id);
create index if not exists simulation_fix_plans_created_at_idx on public.simulation_fix_plans(created_at desc);

