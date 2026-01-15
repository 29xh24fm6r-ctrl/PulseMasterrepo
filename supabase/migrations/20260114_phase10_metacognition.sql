-- Phase 10: Meta-Cognition & Trust
-- Table: brain_confidence_ledger

create table if not exists public.brain_confidence_ledger (
    id uuid not null default gen_random_uuid(),
    owner_user_id text not null,
    created_at timestamptz not null default now(),
    loop_id uuid not null, -- Links to brain loop
    decision_intent_id uuid, -- Links to decision (if any)
    
    -- Specific Phase 10 Metrics
    raw_confidence numeric not null, -- Initial reasoning confidence (0-1)
    post_simulation_confidence numeric not null, -- After simulation impact (0-1)
    confidence_delta numeric not null, -- post - raw
    
    uncertainty_count int not null default 0, -- Count of unknown variables
    escalation_triggered boolean not null default false, -- Did we escalate?
    escalation_level text not null default 'none', -- none | clarify | confirm | defer
    
    notes text,
    
    constraint brain_confidence_ledger_pkey primary key (id)
);

-- Indexes
create index if not exists idx_confidence_ledger_owner 
    on public.brain_confidence_ledger(owner_user_id, created_at desc);

create index if not exists idx_confidence_ledger_escalation
    on public.brain_confidence_ledger(owner_user_id, escalation_triggered, created_at desc);

-- RLS
alter table public.brain_confidence_ledger enable row level security;

create policy "Users can insert their own confidence logs"
    on public.brain_confidence_ledger
    for insert
    to authenticated
    with check (auth.uid()::text = owner_user_id);

create policy "Users can view their own confidence logs"
    on public.brain_confidence_ledger
    for select
    to authenticated
    using (auth.uid()::text = owner_user_id);

-- Note: Reflection Artifacts use the existing 'brain_thought_artifacts' table with kind='reflection'
