-- 20260127100000_pulse_proposals.sql
-- Omega Gate proposals — propose-only artifacts requiring human approval.
-- Created by agents via /call with require_human verdict.
-- Approved/denied by humans via /api/approvals.
--
-- NOTE: Table + RLS + policy created atomically to satisfy DDL guard.
-- MCP service writes with service_role key (bypasses RLS).
-- user_id defaults to 'system' for service-level writes.

-- =============================================
-- STEP 1: Proposals Table
-- =============================================

create table if not exists public.pulse_proposals (
  id uuid primary key default gen_random_uuid(),
  call_id text not null,
  tool text not null,
  scope text not null,
  agent text not null,
  intent text not null,
  inputs jsonb not null default '{}'::jsonb,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'executed', 'expired')),
  verdict text not null default 'require_human',

  decided_at timestamptz,
  decided_by text,
  decision_note text,

  effect_pre_ref uuid,
  effect_post_ref uuid,
  execution_result jsonb,

  user_id text not null default 'system',
  created_at timestamptz not null default now()
);

comment on table public.pulse_proposals is 'Omega Gate proposals requiring human approval before execution';
comment on column public.pulse_proposals.call_id is 'Original gate call_id from the requesting agent';
comment on column public.pulse_proposals.effect_pre_ref is 'pulse_effects id for the pre-flight audit record';
comment on column public.pulse_proposals.effect_post_ref is 'pulse_effects id for the post-execution audit record';

-- =============================================
-- STEP 2: Indexes
-- =============================================

create index if not exists idx_pulse_proposals_status_created
  on public.pulse_proposals (status, created_at desc);
create index if not exists idx_pulse_proposals_agent
  on public.pulse_proposals (agent);
create index if not exists idx_pulse_proposals_tool
  on public.pulse_proposals (tool);
create index if not exists idx_pulse_proposals_user
  on public.pulse_proposals (user_id);

-- =============================================
-- STEP 3: RLS + Policy (DDL guard compliance)
-- =============================================

alter table public.pulse_proposals enable row level security;

drop policy if exists "pulse_user_owns_row" on public.pulse_proposals;
create policy "pulse_user_owns_row"
on public.pulse_proposals
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- Service-level reads for admin client (approvals UI uses admin client)
drop policy if exists "pulse_proposals_admin_read" on public.pulse_proposals;
create policy "pulse_proposals_admin_read"
on public.pulse_proposals
for select
to service_role
using (true);
