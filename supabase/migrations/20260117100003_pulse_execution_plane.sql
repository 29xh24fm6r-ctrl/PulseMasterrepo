-- ============================================================
-- PULSE — EXECUTION PLANE (RUNS + EVENTS)
-- ============================================================

create table if not exists public.pulse_runs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,

  -- What is running (oracle, voice, tool, etc.)
  kind text not null check (kind in ('oracle','voice','tool','system')),

  -- Stable identifier for the runner
  key text not null,

  status text not null check (status in ('queued','running','succeeded','failed','canceled')),

  -- Inputs and outputs for replay / debugging
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error jsonb not null default '{}'::jsonb,

  -- Context frame / UI metadata
  client_context jsonb not null default '{}'::jsonb,

  -- Privacy knobs (e.g., store_audio=false)
  privacy jsonb not null default '{}'::jsonb,

  started_at timestamptz not null default now(),
  finished_at timestamptz null
);

create index if not exists pulse_runs_owner_idx on public.pulse_runs (owner_user_id, started_at desc);
create index if not exists pulse_runs_key_idx on public.pulse_runs (key, started_at desc);

create table if not exists public.pulse_run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pulse_runs(id) on delete cascade,
  owner_user_id uuid not null,

  -- Monotonic sequence number per run (for SSE resume)
  seq bigint generated always as identity,

  event_type text not null,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists pulse_run_events_run_idx on public.pulse_run_events (run_id, seq);
create index if not exists pulse_run_events_owner_idx on public.pulse_run_events (owner_user_id, created_at desc);

alter table public.pulse_runs enable row level security;
alter table public.pulse_run_events enable row level security;

-- OWNER-ONLY RLS
drop policy if exists "pulse_runs_owner_select" on public.pulse_runs;
create policy "pulse_runs_owner_select"
on public.pulse_runs for select
using (owner_user_id = auth.uid());

drop policy if exists "pulse_runs_owner_insert" on public.pulse_runs;
create policy "pulse_runs_owner_insert"
on public.pulse_runs for insert
with check (owner_user_id = auth.uid());

drop policy if exists "pulse_runs_owner_update" on public.pulse_runs;
create policy "pulse_runs_owner_update"
on public.pulse_runs for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "pulse_run_events_owner_select" on public.pulse_run_events;
create policy "pulse_run_events_owner_select"
on public.pulse_run_events for select
using (owner_user_id = auth.uid());

drop policy if exists "pulse_run_events_owner_insert" on public.pulse_run_events;
create policy "pulse_run_events_owner_insert"
on public.pulse_run_events for insert
with check (owner_user_id = auth.uid());
