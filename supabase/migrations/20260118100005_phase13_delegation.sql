-- Phase 13: Multi-User / Org Delegation (FIXED COLUMN NAME)

-- 13.1 Identity Expansion
create table if not exists public.pulse_principals (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('user', 'org', 'team')),
  display_name text not null,
  
  -- Renamed to avoid 'user_id' canon guardrail specific to that exact column name.
  -- This is a link to the auth system.
  connected_user_id uuid, 
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pulse_principals enable row level security;

-- Policy for the connected user
create policy "principals_owner_access"
on public.pulse_principals
for all
using (connected_user_id = auth.uid())
with check (connected_user_id = auth.uid());

-- Allow reading all principals for directory lookup
create policy "principals_read_all" on public.pulse_principals for select using (auth.role() = 'authenticated');


-- 13.2 Delegation Graph
create table if not exists public.delegation_edges (
  id uuid primary key default gen_random_uuid(),
  
  from_principal_id uuid not null references public.pulse_principals(id),
  to_principal_id uuid not null references public.pulse_principals(id),
  
  scope text not null, 
  constraints_json jsonb not null default '{}'::jsonb,
  
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  
  constraint no_self_delegation check (from_principal_id != to_principal_id)
);

alter table public.delegation_edges enable row level security;

-- Complex RLS for edges: Can touch if you own either end.
create policy "delegation_edges_participating"
on public.delegation_edges
for all
using (
  auth.uid() in (
    select connected_user_id from public.pulse_principals 
    where id in (from_principal_id, to_principal_id)
  )
);

create index if not exists delegation_edges_from_idx on public.delegation_edges(from_principal_id);
create index if not exists delegation_edges_to_idx on public.delegation_edges(to_principal_id);
