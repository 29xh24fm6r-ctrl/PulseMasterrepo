-- ============================================================
-- PULSE — PHASE 10: WORKFLOW EXECUTORS (@ SCALE)
-- ============================================================

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  
  parent_run_id uuid references public.pulse_runs(id) on delete cascade,
  
  status text not null check (status in ('queued','running','paused','waiting','succeeded','failed','canceled')),
  
  current_step_index int not null default 0,
  
  plan_json jsonb not null,
  context_json jsonb not null default '{}'::jsonb,
  error_json jsonb null,
  
  locked_at timestamptz null,
  locked_by text null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.workflow_runs enable row level security;

drop policy if exists "workflow_runs_owner" on public.workflow_runs;
create policy "workflow_runs_owner"
on public.workflow_runs
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- INDEXES
create index if not exists workflow_runs_owner_idx
on public.workflow_runs (owner_user_id, created_at desc);

create index if not exists workflow_runs_status_idx
on public.workflow_runs (status) where status in ('queued', 'running', 'waiting');
