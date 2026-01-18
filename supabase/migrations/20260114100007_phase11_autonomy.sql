-- Phase 11: Constrained Autonomy (L0-L1)
-- Tables: autonomy_domain_config, autonomy_events

-- 1. Configuration Table (Per User, Per Domain)
create table if not exists public.autonomy_domain_config (
    id uuid not null default gen_random_uuid(),
    owner_user_id text not null,
    domain text not null, -- 'task_preparation', etc.
    current_level text not null default 'L0', -- 'L0', 'L1', etc.
    confidence_threshold numeric not null default 0.8,
    is_enabled boolean not null default true,
    updated_at timestamptz not null default now(),
    
    constraint autonomy_domain_config_pkey primary key (id),
    constraint uniq_user_domain unique (owner_user_id, domain)
);

-- 2. Telemetry Table (Audit Trail)
create table if not exists public.autonomy_events (
    id uuid not null default gen_random_uuid(),
    owner_user_id text not null,
    created_at timestamptz not null default now(),
    
    loop_id uuid, -- Link to Brain Loop
    decision_intent_id uuid, -- Link to Intent
    
    domain text not null,
    autonomy_level text not null, -- Level attempted
    allowed boolean not null, -- Governor Decision
    executed boolean not null, -- Executor Result
    
    confidence numeric,
    latency_ms int,
    user_response text, -- 'pending', 'accepted', 'rejected', 'ignored'
    
    notes text,
    
    constraint autonomy_events_pkey primary key (id)
);

-- RLS Policies
alter table public.autonomy_domain_config enable row level security;
alter table public.autonomy_events enable row level security;

-- Config Policies
create policy "Users can view and edit their own autonomy config"
    on public.autonomy_domain_config
    for all
    to authenticated
    using (auth.uid()::text = owner_user_id)
    with check (auth.uid()::text = owner_user_id);

-- Event Policies
create policy "Users can insert their own autonomy events"
    on public.autonomy_events
    for insert
    to authenticated
    with check (auth.uid()::text = owner_user_id);

create policy "Users can view their own autonomy events"
    on public.autonomy_events
    for select
    to authenticated
    using (auth.uid()::text = owner_user_id);

-- Indexes
create index if not exists idx_autonomy_events_owner on public.autonomy_events(owner_user_id, created_at desc);
create index if not exists idx_autonomy_config_lookup on public.autonomy_domain_config(owner_user_id, domain);
