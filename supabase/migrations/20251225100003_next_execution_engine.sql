begin;

create extension if not exists pgcrypto;

-- ============================================================
-- A) EXECUTIONS (the canonical queue)
-- ============================================================
create table if not exists public.executions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,

  -- what to do
  kind text not null,                -- e.g. "email.flush", "inbox.triage", "nudge.send", "quest.compute"
  payload jsonb not null default '{}'::jsonb,

  -- scheduling
  run_at timestamptz not null default now(),  -- when eligible to run
  priority int not null default 0,            -- higher runs first

  -- state machine
  status text not null default 'queued',      -- queued | claimed | running | succeeded | failed | cancelled
  attempts int not null default 0,
  max_attempts int not null default 5,

  -- backoff / retry
  last_error text null,
  next_retry_at timestamptz null,

  -- idempotency
  dedupe_key text null,                       -- optional; prevents duplicate queue rows
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- cancellation
  cancelled_at timestamptz null,
  cancel_reason text null,

  unique (user_id, dedupe_key)
);

create index if not exists idx_exec_user_status_time
on public.executions (user_id, status, run_at asc);

create index if not exists idx_exec_ready
on public.executions (status, run_at asc, priority desc);

create index if not exists idx_exec_dedupe
on public.executions (user_id, dedupe_key);

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tr_exec_updated_at on public.executions;
create trigger tr_exec_updated_at
before update on public.executions
for each row execute function public.tg_set_updated_at();

alter table public.executions enable row level security;

drop policy if exists "executions_select_own" on public.executions;
create policy "executions_select_own"
on public.executions for select
using (user_id = auth.uid());

drop policy if exists "executions_insert_own" on public.executions;
create policy "executions_insert_own"
on public.executions for insert
with check (user_id = auth.uid());

drop policy if exists "executions_update_own" on public.executions;
create policy "executions_update_own"
on public.executions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ============================================================
-- B) EXECUTION RUNS (audit of each attempt)
-- ============================================================
create table if not exists public.execution_runs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.executions(id) on delete cascade,
  user_id text not null,

  status text not null,                     -- running | succeeded | failed | cancelled
  started_at timestamptz not null default now(),
  finished_at timestamptz null,

  attempt int not null,
  output jsonb not null default '{}'::jsonb,
  error text null
);

create index if not exists idx_exec_runs_exec on public.execution_runs (execution_id, started_at desc);
create index if not exists idx_exec_runs_user on public.execution_runs (user_id, started_at desc);

alter table public.execution_runs enable row level security;

drop policy if exists "execution_runs_select_own" on public.execution_runs;
create policy "execution_runs_select_own"
on public.execution_runs for select
using (user_id = auth.uid());

drop policy if exists "execution_runs_insert_own" on public.execution_runs;
create policy "execution_runs_insert_own"
on public.execution_runs for insert
with check (user_id = auth.uid());

-- append-only
drop policy if exists "execution_runs_no_update" on public.execution_runs;
create policy "execution_runs_no_update"
on public.execution_runs for update using (false);

drop policy if exists "execution_runs_no_delete" on public.execution_runs;
create policy "execution_runs_no_delete"
on public.execution_runs for delete using (false);

-- ============================================================
-- C) EXECUTION LOGS (fine-grained breadcrumbs)
-- ============================================================
create table if not exists public.execution_logs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.executions(id) on delete cascade,
  user_id text not null,
  level text not null default 'info',      -- info | warn | error
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_exec_logs_exec on public.execution_logs (execution_id, created_at desc);
create index if not exists idx_exec_logs_user on public.execution_logs (user_id, created_at desc);

alter table public.execution_logs enable row level security;

drop policy if exists "execution_logs_select_own" on public.execution_logs;
create policy "execution_logs_select_own"
on public.execution_logs for select
using (user_id = auth.uid());

drop policy if exists "execution_logs_insert_own" on public.execution_logs;
create policy "execution_logs_insert_own"
on public.execution_logs for insert
with check (user_id = auth.uid());

-- append-only
drop policy if exists "execution_logs_no_update" on public.execution_logs;
create policy "execution_logs_no_update"
on public.execution_logs for update using (false);

drop policy if exists "execution_logs_no_delete" on public.execution_logs;
create policy "execution_logs_no_delete"
on public.execution_logs for delete using (false);

-- ============================================================
-- D) RPC: enqueue execution (idempotent via dedupe_key)
-- ============================================================
create or replace function public.rpc_execution_enqueue(
  p_kind text,
  p_payload jsonb,
  p_run_at timestamptz default now(),
  p_priority int default 0,
  p_dedupe_key text default null,
  p_max_attempts int default 5
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
begin
  insert into public.executions(user_id, kind, payload, run_at, priority, dedupe_key, max_attempts)
  values (auth.uid(), p_kind, coalesce(p_payload,'{}'::jsonb), coalesce(p_run_at, now()), coalesce(p_priority,0), p_dedupe_key, coalesce(p_max_attempts,5))
  on conflict (user_id, dedupe_key)
  do update set id = public.executions.id
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================================
-- E) RPC: claim next eligible execution (FOR UPDATE SKIP LOCKED)
-- ============================================================
create or replace function public.rpc_execution_claim_next(
  p_now timestamptz default now()
) returns table(
  execution_id uuid,
  kind text,
  payload jsonb,
  run_at timestamptz,
  priority int,
  attempts int,
  max_attempts int
)
language plpgsql
security invoker
as $$
begin
  return query
  with cte as (
    select e.*
    from public.executions e
    where e.user_id = auth.uid()
      and e.status = 'queued'
      and e.run_at <= p_now
      and (e.next_retry_at is null or e.next_retry_at <= p_now)
      and e.attempts < e.max_attempts
    order by e.priority desc, e.run_at asc, e.created_at asc
    for update skip locked
    limit 1
  )
  update public.executions e2
  set status = 'claimed'
  from cte
  where e2.id = cte.id
  returning
    e2.id as execution_id,
    e2.kind,
    e2.payload,
    e2.run_at,
    e2.priority,
    e2.attempts,
    e2.max_attempts;
end;
$$;

-- ============================================================
-- F) RPC: start run (claimed → running + create run record)
-- ============================================================
create or replace function public.rpc_execution_start_run(
  p_execution_id uuid
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_e public.executions%rowtype;
  v_run_id uuid;
begin
  select * into v_e
  from public.executions
  where id = p_execution_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'execution not found';
  end if;

  if v_e.status = 'cancelled' then
    insert into public.execution_runs(execution_id, user_id, status, attempt, error)
    values (v_e.id, auth.uid(), 'cancelled', v_e.attempts + 1, 'cancelled before start')
    returning id into v_run_id;
    return v_run_id;
  end if;

  if v_e.status <> 'claimed' then
    raise exception 'execution not in claimed status';
  end if;

  update public.executions
  set status = 'running',
      attempts = attempts + 1
  where id = v_e.id;

  insert into public.execution_runs(execution_id, user_id, status, attempt)
  values (v_e.id, auth.uid(), 'running', v_e.attempts + 1)
  returning id into v_run_id;

  return v_run_id;
end;
$$;

-- ============================================================
-- G) RPC: finish run (running → succeeded/failed)
-- with backoff for failures
-- ============================================================
create or replace function public.rpc_execution_finish_run(
  p_run_id uuid,
  p_status text,           -- succeeded | failed | cancelled
  p_output jsonb default '{}'::jsonb,
  p_error text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_run public.execution_runs%rowtype;
  v_exec public.executions%rowtype;
  v_next_retry timestamptz;
  v_backoff_secs int;
begin
  select * into v_run
  from public.execution_runs
  where id = p_run_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'run not found';
  end if;

  select * into v_exec
  from public.executions
  where id = v_run.execution_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'execution not found';
  end if;

  update public.execution_runs
  set status = p_status,
      finished_at = now(),
      output = coalesce(p_output,'{}'::jsonb),
      error = p_error
  where id = v_run.id;

  if p_status = 'succeeded' then
    update public.executions
    set status = 'succeeded',
        last_error = null,
        next_retry_at = null
    where id = v_exec.id;

  elsif p_status = 'cancelled' then
    update public.executions
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now())
    where id = v_exec.id;

  else
    -- failure → requeue with exponential backoff, unless max attempts reached
    v_backoff_secs := least(3600, (2 ^ greatest(0, v_exec.attempts)) * 10); -- 10s,20s,40s,... up to 1hr
    v_next_retry := now() + make_interval(secs => v_backoff_secs);

    if v_exec.attempts >= v_exec.max_attempts then
      update public.executions
      set status = 'failed',
          last_error = p_error,
          next_retry_at = null
      where id = v_exec.id;
    else
      update public.executions
      set status = 'queued',
          last_error = p_error,
          next_retry_at = v_next_retry
      where id = v_exec.id;
    end if;
  end if;

  return v_exec.id;
end;
$$;

-- ============================================================
-- H) RPC: cancel execution
-- ============================================================
create or replace function public.rpc_execution_cancel(
  p_execution_id uuid,
  p_reason text default null
) returns boolean
language plpgsql
security invoker
as $$
begin
  update public.executions
  set status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = p_reason
  where id = p_execution_id
    and user_id = auth.uid()
    and status in ('queued','claimed','running');

  return found;
end;
$$;

commit;
