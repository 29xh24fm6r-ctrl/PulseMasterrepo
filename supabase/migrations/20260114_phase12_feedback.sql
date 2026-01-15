-- Phase 12: Feedback Loop & Learning
-- Updates to autonomy_events and new tables for learning.

-- 1. Alter autonomy_events
-- Adding fields to capture the proposal content and the learning outcome.
-- Note: 'domain', 'confidence', 'user_response', 'latency_ms' already exist.
-- We add 'proposal_text' and 'override_reason' and 'learning_applied'.

alter table public.autonomy_events
add column if not exists proposal_text text,
add column if not exists override_reason text,
add column if not exists learning_applied boolean default false;

-- Add check constraint for user_response if not exists (hard to do selectively, skipping strict check for now or using application logic).
-- But we can try to add a validation trigger or just rely on app logic. App logic is preferred for flexibility.

-- 2. New Table: autonomy_learning_artifacts
-- Stores the 'lesson learned' from an event.
create table if not exists public.autonomy_learning_artifacts (
    id uuid not null default gen_random_uuid(),
    autonomy_event_id uuid references public.autonomy_events(id) on delete cascade,
    
    owner_user_id text not null, -- Denormalized for RLS
    
    pattern_detected text not null,
    confidence_adjustment numeric default 0,
    timing_adjustment jsonb, -- e.g. { "shift_hours": 2 }
    domain_trust_delta numeric default 0,
    suppression_rule_created boolean default false,
    
    created_at timestamptz not null default now(),
    
    constraint autonomy_learning_artifacts_pkey primary key (id)
);

-- 3. New Table: domain_trust_profile
-- Stores the accumulated trust and preferences for a domain.
create table if not exists public.domain_trust_profile (
    id uuid not null default gen_random_uuid(),
    owner_user_id text not null,
    domain text not null,
    
    trust_score numeric default 0.5,
    proposal_frequency_cap integer default 3,
    preferred_time_windows jsonb, -- e.g. [{ "start": "09:00", "end": "17:00" }]
    escalation_allowed boolean default false, -- DOES NOT grant L2, just eligibility for review
    
    updated_at timestamptz not null default now(),
    
    constraint domain_trust_profile_pkey primary key (id),
    constraint uniq_domain_trust_profile unique (owner_user_id, domain)
);

-- RLS Policies
alter table public.autonomy_learning_artifacts enable row level security;
alter table public.domain_trust_profile enable row level security;

-- Learning Artifacts Policies
create policy "Users can view their own learning artifacts"
    on public.autonomy_learning_artifacts for select
    to authenticated
    using (auth.uid()::text = owner_user_id);

create policy "Users (System) can insert learning artifacts"
    on public.autonomy_learning_artifacts for insert
    to authenticated
    with check (auth.uid()::text = owner_user_id);

-- Domain Trust Profile Policies
create policy "Users can view and edit their own domain trust profile"
    on public.domain_trust_profile for all
    to authenticated
    using (auth.uid()::text = owner_user_id)
    with check (auth.uid()::text = owner_user_id);

-- Indexes
create index if not exists idx_learning_artifacts_event on public.autonomy_learning_artifacts(autonomy_event_id);
create index if not exists idx_domain_trust_lookup on public.domain_trust_profile(owner_user_id, domain);
