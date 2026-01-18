-- ============================================================
-- PULSE — PHASE 11: AUTONOMY L2 (DELEGATION CONTRACTS)
-- ============================================================

create table if not exists public.delegation_contracts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  
  intent_type text not null,
  workflow_template_id text not null,
  
  constraints_json jsonb not null default '{}'::jsonb,
  
  max_executions int default 0,
  current_executions int default 0,
  
  expires_at timestamptz,
  revoked_at timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.delegation_contracts enable row level security;

create policy "delegation_contracts_owner"
on public.delegation_contracts
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- INDEXES
create index if not exists delegation_contracts_lookup_idx
on public.delegation_contracts (owner_user_id, intent_type, workflow_template_id)
where revoked_at is null;
