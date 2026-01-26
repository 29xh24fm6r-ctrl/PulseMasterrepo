-- 20260126100005_omega_trust_workflow_tables.sql
-- Supporting tables for OmegaTrustWorkflow Phase 1
--
-- Tables created:
-- - pulse_execution_log: Idempotent execution tracking
-- - pulse_review_requests: Human review queue
-- - pulse_observer_events: Workflow observability
-- - pulse_action_authorizations: Pre-authorization for irreversible actions
--
-- NOTE: Each table + RLS + policy created atomically to satisfy DDL guard

-- =============================================
-- STEP 1: Execution Log (Idempotency)
-- =============================================

create table if not exists public.pulse_execution_log (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text unique not null,
  user_id text not null,
  draft_id uuid,
  action_type text not null,
  autonomy_level integer not null,
  executed_at timestamptz not null default now(),
  success boolean not null default true,
  error text,
  created_at timestamptz default now()
);

comment on table public.pulse_execution_log is 'Tracks executed actions with idempotency keys to prevent duplicate execution';
comment on column public.pulse_execution_log.idempotency_key is 'hash(workflowId + draftId + actionType) - unique per execution attempt';

create index if not exists idx_execution_log_idempotency on public.pulse_execution_log(idempotency_key);
create index if not exists idx_execution_log_user on public.pulse_execution_log(user_id);
create index if not exists idx_execution_log_draft on public.pulse_execution_log(draft_id);

-- Enable RLS and create required policy immediately
alter table public.pulse_execution_log enable row level security;

drop policy if exists "pulse_user_owns_row" on public.pulse_execution_log;
create policy "pulse_user_owns_row"
on public.pulse_execution_log
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- =============================================
-- STEP 2: Review Requests
-- =============================================

create table if not exists public.pulse_review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  draft_id uuid not null,
  session_id text not null,
  priority text not null check (priority in ('low', 'normal', 'high', 'urgent')),
  guardian_decision jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.pulse_review_requests is 'Queue for drafts requiring human review before execution';

create index if not exists idx_review_requests_user on public.pulse_review_requests(user_id);
create index if not exists idx_review_requests_status on public.pulse_review_requests(status);
create index if not exists idx_review_requests_draft on public.pulse_review_requests(draft_id);
create index if not exists idx_review_requests_priority on public.pulse_review_requests(priority, created_at);

-- Enable RLS and create required policy immediately
alter table public.pulse_review_requests enable row level security;

drop policy if exists "pulse_user_owns_row" on public.pulse_review_requests;
create policy "pulse_user_owns_row"
on public.pulse_review_requests
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- =============================================
-- STEP 3: Observer Events
-- =============================================

create table if not exists public.pulse_observer_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);

comment on table public.pulse_observer_events is 'Observability events emitted during workflow execution';

create index if not exists idx_observer_events_user on public.pulse_observer_events(user_id);
create index if not exists idx_observer_events_type on public.pulse_observer_events(event_type);
create index if not exists idx_observer_events_created on public.pulse_observer_events(created_at);

-- Enable RLS and create required policy immediately
alter table public.pulse_observer_events enable row level security;

drop policy if exists "pulse_user_owns_row" on public.pulse_observer_events;
create policy "pulse_user_owns_row"
on public.pulse_observer_events
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- =============================================
-- STEP 4: Action Authorizations (Irreversible Actions)
-- =============================================

create table if not exists public.pulse_action_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  action_type text not null,
  active boolean not null default true,
  granted_at timestamptz default now(),
  expires_at timestamptz,
  scope jsonb default '{}',
  created_at timestamptz default now()
);

comment on table public.pulse_action_authorizations is 'Pre-authorizations for irreversible actions (send_email, etc.)';
comment on column public.pulse_action_authorizations.scope is 'Optional constraints on the authorization (e.g., recipient whitelist)';

create unique index if not exists idx_action_auth_user_type on public.pulse_action_authorizations(user_id, action_type) where active = true;
create index if not exists idx_action_auth_user on public.pulse_action_authorizations(user_id);

-- Enable RLS and create required policy immediately
alter table public.pulse_action_authorizations enable row level security;

drop policy if exists "pulse_user_owns_row" on public.pulse_action_authorizations;
create policy "pulse_user_owns_row"
on public.pulse_action_authorizations
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- =============================================
-- Done: OmegaTrustWorkflow supporting tables created
-- =============================================
