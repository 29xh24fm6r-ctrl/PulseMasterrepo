-- 20260126100006_pulse_effects.sql
-- Omega Gate effects ledger — immutable audit trail for every gate call.
-- Every call writes BEFORE execution (proposed). Post-execution updates status.
--
-- NOTE: Table + RLS + policy created atomically to satisfy DDL guard.
-- The MCP service uses service_role key (bypasses RLS).
-- user_id defaults to 'system' for service-level writes.

-- =============================================
-- STEP 1: Effects Ledger Table
-- =============================================

create table if not exists public.pulse_effects (
  id uuid primary key default gen_random_uuid(),
  call_id text not null,
  agent text not null,
  tool text not null,
  scope text not null,
  intent text not null,
  inputs_hash text not null,
  confidence_score numeric not null,
  confidence_verdict text not null check (confidence_verdict in ('allow', 'require_human', 'deny')),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'executed', 'denied', 'require_human')),
  result_hash text,
  reversible boolean,
  user_id text not null default 'system',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.pulse_effects is 'Omega Gate effects ledger — immutable audit trail for every gate call';
comment on column public.pulse_effects.call_id is 'Unique call ID from the requesting agent';
comment on column public.pulse_effects.inputs_hash is 'SHA-256 hash (truncated) of the call inputs for audit';
comment on column public.pulse_effects.confidence_score is 'Confidence score at time of evaluation (0.0 - 1.0)';
comment on column public.pulse_effects.status is 'Lifecycle: proposed → executed/denied/require_human';

-- =============================================
-- STEP 2: Indexes
-- =============================================

create index if not exists idx_pulse_effects_call_id on public.pulse_effects(call_id);
create index if not exists idx_pulse_effects_agent on public.pulse_effects(agent);
create index if not exists idx_pulse_effects_tool on public.pulse_effects(tool);
create index if not exists idx_pulse_effects_status on public.pulse_effects(status);
create index if not exists idx_pulse_effects_created on public.pulse_effects(created_at desc);
create index if not exists idx_pulse_effects_user on public.pulse_effects(user_id);

-- =============================================
-- STEP 3: RLS + Policy (DDL guard compliance)
-- =============================================

alter table public.pulse_effects enable row level security;

drop policy if exists "pulse_user_owns_row" on public.pulse_effects;
create policy "pulse_user_owns_row"
on public.pulse_effects
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);
