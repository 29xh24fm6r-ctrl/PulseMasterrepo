-- 20251225_xp_independency_ledger.sql
-- XP Independency: Evidence → Evaluation Run → XP Ledger (append-only)
-- Assumptions:
-- - You have auth.uid() available (Supabase Auth)
-- - You have (or will have) a canonical "life_events" table. If not, this creates a minimal one.

begin;

-- -----------------------------
-- 0) Extensions (safe)
-- -----------------------------
create extension if not exists pgcrypto;

-- -----------------------------
-- 1) Minimal life_events (facts only)
-- If you already have life_events, you can delete this section.
-- -----------------------------
create table if not exists public.life_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_life_events_user_time on public.life_events (user_id, occurred_at desc);

alter table public.life_events enable row level security;

drop policy if exists "life_events_select_own" on public.life_events;
create policy "life_events_select_own"
on public.life_events for select
using (user_id = auth.uid());

drop policy if exists "life_events_insert_own" on public.life_events;
create policy "life_events_insert_own"
on public.life_events for insert
with check (user_id = auth.uid());

-- Optional: updates/deletes discouraged for facts, but allow if needed
drop policy if exists "life_events_update_own" on public.life_events;
create policy "life_events_update_own"
on public.life_events for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- -----------------------------
-- 2) Evidence (append-only inputs to evaluation)
-- -----------------------------
create table if not exists public.life_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  life_event_id uuid null references public.life_events(id) on delete set null,
  evidence_type text not null,
  evidence_payload jsonb not null default '{}'::jsonb,
  confidence numeric(5,4) not null default 1.0000,
  source text not null default 'ui', -- ui | ai | integration | import
  created_at timestamptz not null default now()
);

create index if not exists idx_life_evidence_user_time on public.life_evidence (user_id, created_at desc);
create index if not exists idx_life_evidence_event on public.life_evidence (life_event_id);

alter table public.life_evidence enable row level security;

drop policy if exists "life_evidence_select_own" on public.life_evidence;
create policy "life_evidence_select_own"
on public.life_evidence for select
using (user_id = auth.uid());

drop policy if exists "life_evidence_insert_own" on public.life_evidence;
create policy "life_evidence_insert_own"
on public.life_evidence for insert
with check (user_id = auth.uid());

-- Hard lock: prevent updates/deletes to keep it append-only
drop policy if exists "life_evidence_no_update" on public.life_evidence;
create policy "life_evidence_no_update"
on public.life_evidence for update
using (false);

drop policy if exists "life_evidence_no_delete" on public.life_evidence;
create policy "life_evidence_no_delete"
on public.life_evidence for delete
using (false);

-- -----------------------------
-- 3) Evaluator registry (versions + metadata)
-- -----------------------------
create table if not exists public.xp_evaluators (
  id uuid primary key default gen_random_uuid(),
  key text not null,                -- e.g. "quest.default", "habit.workout"
  version int not null,             -- evaluator version
  is_active boolean not null default true,
  description text null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (key, version)
);

alter table public.xp_evaluators enable row level security;

-- Users can read evaluator definitions (safe); writes are admin-only (no policy here)
drop policy if exists "xp_evaluators_select_all" on public.xp_evaluators;
create policy "xp_evaluators_select_all"
on public.xp_evaluators for select
using (true);

-- -----------------------------
-- 4) Evaluation runs (pure scoring snapshot)
-- Each run ties evidence → evaluator key/version → resulting XP vector
-- -----------------------------
create table if not exists public.xp_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  evaluator_key text not null,
  evaluator_version int not null,
  evidence_id uuid not null references public.life_evidence(id) on delete restrict,
  result_xp jsonb not null default '{}'::jsonb, -- {"xp_physical": 30, "xp_discipline": 10}
  result_meta jsonb not null default '{}'::jsonb, -- {"confidence":0.92, ...}
  created_at timestamptz not null default now(),
  -- idempotency: one run per (user, evidence, evaluator version)
  unique (user_id, evidence_id, evaluator_key, evaluator_version)
);

create index if not exists idx_xp_eval_runs_user_time on public.xp_evaluation_runs (user_id, created_at desc);
create index if not exists idx_xp_eval_runs_evidence on public.xp_evaluation_runs (evidence_id);

alter table public.xp_evaluation_runs enable row level security;

drop policy if exists "xp_eval_runs_select_own" on public.xp_evaluation_runs;
create policy "xp_eval_runs_select_own"
on public.xp_evaluation_runs for select
using (user_id = auth.uid());

drop policy if exists "xp_eval_runs_insert_own" on public.xp_evaluation_runs;
create policy "xp_eval_runs_insert_own"
on public.xp_evaluation_runs for insert
with check (user_id = auth.uid());

-- Append-only runs
drop policy if exists "xp_eval_runs_no_update" on public.xp_evaluation_runs;
create policy "xp_eval_runs_no_update"
on public.xp_evaluation_runs for update
using (false);

drop policy if exists "xp_eval_runs_no_delete" on public.xp_evaluation_runs;
create policy "xp_eval_runs_no_delete"
on public.xp_evaluation_runs for delete
using (false);

-- -----------------------------
-- 5) XP Ledger (append-only source of truth)
-- -----------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'xp_kind') then
    create type public.xp_kind as enum (
      'xp_physical',
      'xp_discipline',
      'xp_identity',
      'xp_relationship',
      'xp_career',
      'xp_mind',
      'xp_spirit'
    );
  end if;
end $$;

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  xp_type public.xp_kind not null,
  amount int not null, -- positive or negative
  source_kind text not null, -- 'evaluation' | 'manual' | 'import' | 'reversal'
  source_id uuid null,       -- e.g. xp_evaluation_runs.id
  memo text null,
  evaluator_key text null,
  evaluator_version int null,
  evidence_id uuid null references public.life_evidence(id) on delete set null,
  created_at timestamptz not null default now(),
  reversal_of uuid null references public.xp_ledger(id) on delete restrict,
  -- idempotency: prevent double-issuing for same evaluation output
  unique (user_id, xp_type, source_kind, source_id)
);

create index if not exists idx_xp_ledger_user_time on public.xp_ledger (user_id, created_at desc);
create index if not exists idx_xp_ledger_source on public.xp_ledger (source_kind, source_id);

alter table public.xp_ledger enable row level security;

drop policy if exists "xp_ledger_select_own" on public.xp_ledger;
create policy "xp_ledger_select_own"
on public.xp_ledger for select
using (user_id = auth.uid());

-- Users should not insert ledger rows directly (only via secure RPC in future).
-- But for now, allow inserts if own (optional). If you want bulletproof: set to false and only use security definer RPC.
drop policy if exists "xp_ledger_insert_own" on public.xp_ledger;
create policy "xp_ledger_insert_own"
on public.xp_ledger for insert
with check (user_id = auth.uid());

-- Append-only ledger
drop policy if exists "xp_ledger_no_update" on public.xp_ledger;
create policy "xp_ledger_no_update"
on public.xp_ledger for update
using (false);

drop policy if exists "xp_ledger_no_delete" on public.xp_ledger;
create policy "xp_ledger_no_delete"
on public.xp_ledger for delete
using (false);

-- -----------------------------
-- 6) Derived totals view (never store totals)
-- -----------------------------
create or replace view public.v_xp_totals as
select
  user_id,
  xp_type,
  sum(amount)::int as total
from public.xp_ledger
group by user_id, xp_type;

-- -----------------------------
-- 7) RPC: record evidence (simple, user scoped)
-- -----------------------------
create or replace function public.rpc_xp_record_evidence(
  p_event_id uuid,
  p_evidence_type text,
  p_evidence_payload jsonb,
  p_confidence numeric,
  p_source text
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
begin
  insert into public.life_evidence(user_id, life_event_id, evidence_type, evidence_payload, confidence, source)
  values (auth.uid(), p_event_id, p_evidence_type, coalesce(p_evidence_payload, '{}'::jsonb), coalesce(p_confidence, 1.0), coalesce(p_source, 'ui'))
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------
-- 8) RPC: create evaluation run (idempotent)
-- (Pure scoring is done in app code; this stores the result)
-- -----------------------------
create or replace function public.rpc_xp_create_eval_run(
  p_evaluator_key text,
  p_evaluator_version int,
  p_evidence_id uuid,
  p_result_xp jsonb,
  p_result_meta jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
begin
  insert into public.xp_evaluation_runs(user_id, evaluator_key, evaluator_version, evidence_id, result_xp, result_meta)
  values (
    auth.uid(),
    p_evaluator_key,
    p_evaluator_version,
    p_evidence_id,
    coalesce(p_result_xp, '{}'::jsonb),
    coalesce(p_result_meta, '{}'::jsonb)
  )
  on conflict (user_id, evidence_id, evaluator_key, evaluator_version)
  do update set id = public.xp_evaluation_runs.id
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------
-- 9) RPC: issue ledger rows from evaluation run (idempotent)
-- Converts result_xp JSON into multiple xp_ledger rows.
-- -----------------------------
create or replace function public.rpc_xp_issue_from_eval_run(
  p_eval_run_id uuid
) returns int
language plpgsql
security invoker
as $$
declare
  v_run record;
  v_k text;
  v_amount int;
  v_count int := 0;
begin
  select *
  into v_run
  from public.xp_evaluation_runs
  where id = p_eval_run_id
    and user_id = auth.uid();

  if not found then
    raise exception 'eval_run not found or not owned';
  end if;

  for v_k, v_amount in
    select key, (value::text)::int
    from jsonb_each(v_run.result_xp)
  loop
    -- only accept keys that map to xp_kind enum
    begin
      insert into public.xp_ledger(
        user_id,
        xp_type,
        amount,
        source_kind,
        source_id,
        memo,
        evaluator_key,
        evaluator_version,
        evidence_id
      )
      values (
        auth.uid(),
        v_k::public.xp_kind,
        v_amount,
        'evaluation',
        v_run.id,
        'Issued from evaluation run',
        v_run.evaluator_key,
        v_run.evaluator_version,
        v_run.evidence_id
      )
      on conflict (user_id, xp_type, source_kind, source_id)
      do nothing;

      if found then
        v_count := v_count + 1;
      end if;
    exception when others then
      -- ignore unknown xp keys or bad casts
      continue;
    end;
  end loop;

  return v_count;
end;
$$;

-- -----------------------------
-- 10) RPC: reverse a ledger entry (append-only)
-- -----------------------------
create or replace function public.rpc_xp_reverse_ledger_entry(
  p_ledger_id uuid,
  p_memo text
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_row record;
  v_new_id uuid;
begin
  select *
  into v_row
  from public.xp_ledger
  where id = p_ledger_id
    and user_id = auth.uid();

  if not found then
    raise exception 'ledger entry not found or not owned';
  end if;

  insert into public.xp_ledger(
    user_id, xp_type, amount, source_kind, source_id, memo,
    evaluator_key, evaluator_version, evidence_id, reversal_of
  )
  values (
    auth.uid(),
    v_row.xp_type,
    -v_row.amount,
    'reversal',
    v_row.id,
    coalesce(p_memo, 'Reversal'),
    v_row.evaluator_key,
    v_row.evaluator_version,
    v_row.evidence_id,
    v_row.id
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

commit;
