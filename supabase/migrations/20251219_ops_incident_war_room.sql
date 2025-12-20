-- 20251219_ops_incident_war_room.sql
-- Creates incident + event tables for the in-app Incident War Room.

begin;

-- 1) Incidents (optional but useful for grouping)
create table if not exists public.ops_incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'open', -- open | resolved
  severity text not null default 'sev2', -- sev1 | sev2 | sev3
  title text not null,
  summary text null,

  -- helpful pointers
  triggering_run_url text null,
  rollback_pr_url text null,
  resolved_at timestamptz null
);

create index if not exists ops_incidents_status_created_at_idx
  on public.ops_incidents (status, created_at desc);

-- 2) Incident events (timeline feed)
create table if not exists public.ops_incident_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- optional relationship
  incident_id uuid null references public.ops_incidents(id) on delete set null,

  -- event classification
  source text not null,     -- github | smoke | rollback | app
  event_type text not null, -- smoke_failed | rollback_pr_created | canary_green_applied | rollback_merged | etc
  level text not null default 'info', -- info | warn | error | success

  summary text not null,
  link text null,

  -- raw payload (json)
  payload jsonb not null default '{}'::jsonb
);

create index if not exists ops_incident_events_created_at_idx
  on public.ops_incident_events (created_at desc);

create index if not exists ops_incident_events_type_created_at_idx
  on public.ops_incident_events (event_type, created_at desc);

create index if not exists ops_incident_events_source_created_at_idx
  on public.ops_incident_events (source, created_at desc);

create index if not exists ops_incident_events_payload_gin_idx
  on public.ops_incident_events using gin (payload);

-- 3) updated_at trigger for ops_incidents
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ops_incidents_updated_at on public.ops_incidents;
create trigger trg_ops_incidents_updated_at
before update on public.ops_incidents
for each row execute function public.set_updated_at();

-- 4) RLS
alter table public.ops_incidents enable row level security;
alter table public.ops_incident_events enable row level security;

-- Conservative: only authenticated users can read; only service role can write.
-- Adjust to your role model later (admin-only, bank tenancy, etc.)

drop policy if exists "ops_incidents_read_auth" on public.ops_incidents;
create policy "ops_incidents_read_auth"
on public.ops_incidents
for select
to authenticated
using (true);

drop policy if exists "ops_incident_events_read_auth" on public.ops_incident_events;
create policy "ops_incident_events_read_auth"
on public.ops_incident_events
for select
to authenticated
using (true);

-- No insert/update/delete policies: service role only (via supabaseAdmin)
-- (RLS will block others automatically.)

commit;

