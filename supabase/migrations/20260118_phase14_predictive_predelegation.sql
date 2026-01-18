-- Phase 14: Predictive Pre-Delegation
-- Date: 2026-01-18

create table if not exists delegation_readiness_cache (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null,
    actor_principal_id uuid not null references pulse_principals(id),
    target_principal_id uuid references pulse_principals(id), -- nullable until resolved
    scope text not null,
    reason text not null,
    context_path text not null,
    confidence numeric not null check (confidence >= 0 and confidence <= 1),
    signals_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    dismissed_at timestamptz,
    accepted_at timestamptz,
    last_shown_at timestamptz,
    shown_count int not null default 0,
    check (expires_at > created_at)
);

create index if not exists idx_readiness_owner_created on delegation_readiness_cache(owner_user_id, created_at desc);
create index if not exists idx_readiness_owner_dismissed on delegation_readiness_cache(owner_user_id, dismissed_at);
create index if not exists idx_readiness_owner_accepted on delegation_readiness_cache(owner_user_id, accepted_at);
create index if not exists idx_readiness_expires on delegation_readiness_cache(expires_at);
create index if not exists idx_readiness_owner_context on delegation_readiness_cache(owner_user_id, context_path);

alter table delegation_readiness_cache enable row level security;

create policy "Owner can manage readiness cache"
    on delegation_readiness_cache
    for all
    using (owner_user_id = auth.uid()); -- Adjust if using a different owner mapping convention in codebase

-- Feedback Table

create table if not exists delegation_prediction_feedback (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null,
    readiness_id uuid references delegation_readiness_cache(id) on delete cascade,
    action text not null check (action in ('accepted', 'dismissed', 'ignored')),
    created_at timestamptz not null default now()
);

alter table delegation_prediction_feedback enable row level security;

create policy "Owner can manage prediction feedback"
    on delegation_prediction_feedback
    for all
    using (owner_user_id = auth.uid());
