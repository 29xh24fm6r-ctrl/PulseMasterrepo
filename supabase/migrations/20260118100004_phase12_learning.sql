-- Phase 12: Learning Artifact Layer
-- Table: learning_artifacts
-- Stores outcome signals from workflows and delegations purely for learning/confidence calibration.

create table if not exists public.learning_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  
  source_type text not null check (source_type in ('workflow_outcome', 'delegation_result', 'user_feedback')),
  source_id uuid not null, -- Reference to the run_id, delegation_id, or null
  
  signal_type text not null check (signal_type in ('success', 'failure', 'interruption', 'override')),
  
  confidence_delta numeric not null default 0, -- Recommended adjustment (+0.1, -0.5, etc.)
  
  metadata_json jsonb not null default '{}'::jsonb,
  
  created_at timestamptz not null default now()
);

-- RLS: Owner only
alter table public.learning_artifacts enable row level security;

create policy "learning_artifacts_owner_all"
on public.learning_artifacts
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- Index for lookup by source
create index if not exists learning_artifacts_source_idx
on public.learning_artifacts (source_id, source_type);

-- Index for learning analysis (recent signals)
create index if not exists learning_artifacts_owner_created_idx
on public.learning_artifacts (owner_user_id, created_at desc);
