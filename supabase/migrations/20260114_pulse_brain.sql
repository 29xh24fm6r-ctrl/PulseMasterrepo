-- PULSE BRAIN MIGRATION: 20260114_pulse_brain.sql

-- 1. Table: brain_thought_artifacts
-- Stores immutable outputs from the Reasoning and Simulation engines.
create table if not exists brain_thought_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  created_at timestamptz not null default now(),
  loop_id uuid not null, -- Ties artifacts to a specific execution loop
  kind text not null check (kind in ('reasoning', 'simulation', 'reflection')),
  input_packet jsonb not null,
  output jsonb not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  uncertainty_flags text[] not null default '{}',
  model text not null, -- e.g., 'gemini-1.5-pro'
  latency_ms int not null default 0,
  token_estimate int not null default 0,
  checksum text not null -- For integrity/deduplication
);

-- Indexes for performance
create index if not exists idx_brain_artifacts_owner_created on brain_thought_artifacts(owner_user_id, created_at desc);
create index if not exists idx_brain_artifacts_loop on brain_thought_artifacts(owner_user_id, loop_id);
create index if not exists idx_brain_artifacts_kind on brain_thought_artifacts(owner_user_id, kind, created_at desc);

-- RLS: Owner Access Only
alter table brain_thought_artifacts enable row level security;

create policy "Users can insert their own artifacts"
on brain_thought_artifacts for insert
with check (owner_user_id = auth.jwt() ->> 'sub');

create policy "Users can view their own artifacts"
on brain_thought_artifacts for select
using (owner_user_id = auth.jwt() ->> 'sub');


-- 2. Table: brain_decision_intents
-- Stores proposed decisions from the Orchestrator for the DecisionAuthority to act upon.
create table if not exists brain_decision_intents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  created_at timestamptz not null default now(),
  loop_id uuid not null,
  intent jsonb not null, -- Schema validated DecisionIntent
  requires_confirmation boolean not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  source_artifact_ids uuid[] not null default '{}'
);

-- Indexes
create index if not exists idx_brain_intents_owner_created on brain_decision_intents(owner_user_id, created_at desc);
create index if not exists idx_brain_intents_status on brain_decision_intents(owner_user_id, status, created_at desc);

-- RLS: Owner Access Only
alter table brain_decision_intents enable row level security;

create policy "Users can insert their own intents"
on brain_decision_intents for insert
with check (owner_user_id = auth.jwt() ->> 'sub');

create policy "Users can view their own intents"
on brain_decision_intents for select
using (owner_user_id = auth.jwt() ->> 'sub');

create policy "Users can update their own intents"
on brain_decision_intents for update
using (owner_user_id = auth.jwt() ->> 'sub');
