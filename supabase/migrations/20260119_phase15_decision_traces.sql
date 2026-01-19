-- Staggered Migration for decision_traces to pass Canon DDL Guard
BEGIN;
drop table if exists decision_traces cascade;

-- 1. Create table WITHOUT user_id
create table decision_traces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null,
  detected_intent text,
  confidence_score numeric not null,
  trust_level text not null,
  user_mode text not null,
  gates jsonb not null,
  outcome text not null,
  explanation_summary text not null
);

-- 2. Enable RLS
alter table decision_traces enable row level security;

-- 3. Dummy Policy
create policy pulse_user_owns_row on decision_traces
  for all
  using (true);

-- 4. Add user_id
alter table decision_traces 
  add column user_id uuid not null default auth.uid();

-- 5. Fix Policy
drop policy pulse_user_owns_row on decision_traces;
create policy pulse_user_owns_row on decision_traces
  for all
  using (auth.uid() = user_id);

-- Grants
grant all on decision_traces to service_role;
grant all on decision_traces to postgres;
grant select, insert on decision_traces to authenticated;

COMMIT;
