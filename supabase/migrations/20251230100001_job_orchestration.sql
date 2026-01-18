-- 20251230_job_orchestration.sql
-- Pulse: Agent Orchestration Core (enqueue, claim, heartbeat, complete, retry/DLQ)
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS patterns)

begin;

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------------------
-- 1) Core tables (lightweight + additive). If you already have these tables, this only
--    adds missing columns.
-- -------------------------------------------------------------------------------------

create table if not exists public.job_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  user_id_uuid uuid null,
  owner_user_id text null,

  job_type text not null,
  lane text not null default 'background',
  priority int not null default 0,

  status text not null default 'queued',  -- queued|claimed|running|succeeded|failed|dead_letter|canceled
  payload jsonb not null default '{}'::jsonb,

  dedupe_key text null,
  request_id text null,

  attempts int not null default 0,
  max_attempts int not null default 5,

  run_after timestamptz null,      -- when eligible
  claimed_at timestamptz null,
  claimed_by text null,            -- worker_id
  heartbeat_at timestamptz null,

  started_at timestamptz null,
  finished_at timestamptz null,

  last_error jsonb null,
  last_result jsonb null
);

-- Additive columns (if the table existed with fewer columns)
alter table public.job_queue add column if not exists updated_at timestamptz not null default now();
alter table public.job_queue add column if not exists user_id_uuid uuid null;
alter table public.job_queue add column if not exists owner_user_id text null;
alter table public.job_queue add column if not exists job_type text not null default 'unknown';
alter table public.job_queue add column if not exists lane text not null default 'background';
alter table public.job_queue add column if not exists priority int not null default 0;
alter table public.job_queue add column if not exists status text not null default 'queued';
alter table public.job_queue add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.job_queue add column if not exists dedupe_key text null;
alter table public.job_queue add column if not exists request_id text null;
alter table public.job_queue add column if not exists attempts int not null default 0;
alter table public.job_queue add column if not exists max_attempts int not null default 5;
alter table public.job_queue add column if not exists run_after timestamptz null;
alter table public.job_queue add column if not exists claimed_at timestamptz null;
alter table public.job_queue add column if not exists claimed_by text null;
alter table public.job_queue add column if not exists heartbeat_at timestamptz null;
alter table public.job_queue add column if not exists started_at timestamptz null;
alter table public.job_queue add column if not exists finished_at timestamptz null;
alter table public.job_queue add column if not exists last_error jsonb null;
alter table public.job_queue add column if not exists last_result jsonb null;

create index if not exists idx_job_queue_status_lane_runafter
  on public.job_queue (status, lane, run_after);

create index if not exists idx_job_queue_user_status
  on public.job_queue (user_id_uuid, status);

create index if not exists idx_job_queue_dedupe_key
  on public.job_queue (dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_job_queue_claimed_by
  on public.job_queue (claimed_by)
  where claimed_by is not null;

-- Quotas: lane quota (per-user concurrent running jobs per lane)
create table if not exists public.job_queue_lane_quota (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id_uuid uuid null,               -- null = default for all users
  lane text not null,
  max_running int not null default 1
);

create unique index if not exists uq_job_queue_lane_quota_user_lane
  on public.job_queue_lane_quota (coalesce(user_id_uuid, '00000000-0000-0000-0000-000000000000'::uuid), lane);

-- Rate window: (optional) basic throttling
create table if not exists public.job_queue_rate_window (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id_uuid uuid null,             -- null = default
  lane text not null,
  window_seconds int not null default 60,
  max_claims int not null default 30
);

create unique index if not exists uq_job_queue_rate_window_user_lane
  on public.job_queue_rate_window (coalesce(user_id_uuid, '00000000-0000-0000-0000-000000000000'::uuid), lane);

-- Execution runs/logs (lightweight audit)
create table if not exists public.execution_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id_uuid uuid null,
  owner_user_id text null,

  job_id uuid null,
  job_type text null,
  lane text null,
  worker_id text null,

  attempt int not null default 0,
  status text not null default 'running', -- running|succeeded|failed

  started_at timestamptz not null default now(),
  ended_at timestamptz null,

  result jsonb null,
  error jsonb null
);

create index if not exists idx_execution_runs_job_id on public.execution_runs (job_id);
create index if not exists idx_execution_runs_user_id_uuid on public.execution_runs (user_id_uuid);

create table if not exists public.execution_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id_uuid uuid null,
  owner_user_id text null,

  job_id uuid null,
  run_id uuid null,

  level text not null default 'info', -- debug|info|warn|error
  message text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_execution_logs_job_id on public.execution_logs (job_id);
create index if not exists idx_execution_logs_run_id on public.execution_logs (run_id);

-- -------------------------------------------------------------------------------------
-- 2) RLS: internal tables should be service-role only
-- -------------------------------------------------------------------------------------

alter table public.job_queue enable row level security;
alter table public.execution_runs enable row level security;
alter table public.execution_logs enable row level security;
alter table public.job_queue_lane_quota enable row level security;
alter table public.job_queue_rate_window enable row level security;

do $$
begin
  -- Drop/replace policies safely
  -- job_queue
  execute 'drop policy if exists job_queue_service_role on public.job_queue';
  execute 'create policy job_queue_service_role on public.job_queue
           for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')';

  -- execution_runs
  execute 'drop policy if exists execution_runs_service_role on public.execution_runs';
  execute 'create policy execution_runs_service_role on public.execution_runs
           for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')';

  -- execution_logs
  execute 'drop policy if exists execution_logs_service_role on public.execution_logs';
  execute 'create policy execution_logs_service_role on public.execution_logs
           for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')';

  -- quotas
  execute 'drop policy if exists job_queue_lane_quota_service_role on public.job_queue_lane_quota';
  execute 'create policy job_queue_lane_quota_service_role on public.job_queue_lane_quota
           for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')';

  execute 'drop policy if exists job_queue_rate_window_service_role on public.job_queue_rate_window';
  execute 'create policy job_queue_rate_window_service_role on public.job_queue_rate_window
           for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')';
end $$;

-- -------------------------------------------------------------------------------------
-- 3) Defaults: sane quotas/rate windows (global defaults)
-- -------------------------------------------------------------------------------------

insert into public.job_queue_lane_quota (user_id_uuid, lane, max_running)
values
  (null, 'realtime', 2),
  (null, 'background', 1),
  (null, 'nightly', 1),
  (null, 'maintenance', 1)
on conflict do nothing;

insert into public.job_queue_rate_window (user_id_uuid, lane, window_seconds, max_claims)
values
  (null, 'realtime', 60, 60),
  (null, 'background', 60, 30),
  (null, 'nightly', 300, 60),
  (null, 'maintenance', 300, 30)
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 4) Helper: updated_at trigger
-- -------------------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'tr_job_queue_touch_updated_at'
  ) then
    create trigger tr_job_queue_touch_updated_at
    before update on public.job_queue
    for each row execute function public.touch_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'tr_execution_runs_touch_updated_at'
  ) then
    create trigger tr_execution_runs_touch_updated_at
    before update on public.execution_runs
    for each row execute function public.touch_updated_at();
  end if;
end $$;

-- -------------------------------------------------------------------------------------
-- 5) RPCs: enqueue / claim / heartbeat / complete
-- -------------------------------------------------------------------------------------

-- Enqueue with dedupe. Returns the row.
create or replace function public.job_enqueue(
  p_user_id_uuid uuid,
  p_owner_user_id text,
  p_job_type text,
  p_lane text,
  p_priority int,
  p_payload jsonb,
  p_dedupe_key text default null,
  p_request_id text default null,
  p_run_after timestamptz default null,
  p_max_attempts int default 5
)
returns public.job_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.job_queue;
  v_row public.job_queue;
begin
  if p_dedupe_key is not null then
    select *
      into v_existing
    from public.job_queue
    where dedupe_key = p_dedupe_key
      and status in ('queued','claimed','running')
    order by created_at desc
    limit 1;

    if found then
      return v_existing;
    end if;
  end if;

  insert into public.job_queue (
    user_id_uuid, owner_user_id,
    job_type, lane, priority,
    payload, dedupe_key, request_id,
    run_after, max_attempts
  )
  values (
    p_user_id_uuid, p_owner_user_id,
    p_job_type, coalesce(p_lane,'background'), coalesce(p_priority,0),
    coalesce(p_payload,'{}'::jsonb), p_dedupe_key, p_request_id,
    p_run_after, coalesce(p_max_attempts,5)
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Claim next eligible job (atomic). Returns null if none.
create or replace function public.job_claim_next(
  p_worker_id text,
  p_lanes text[] default array['realtime','background','nightly','maintenance'],
  p_heartbeat_timeout_seconds int default 90
)
returns public.job_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.job_queue;
  v_lane text;
  v_quota int;
  v_window_seconds int;
  v_max_claims int;
  v_claims int;
  v_running int;
begin
  -- Reclaim stale claimed/running jobs (heartbeat expired)
  update public.job_queue
     set status = 'queued',
         claimed_at = null,
         claimed_by = null,
         heartbeat_at = null,
         started_at = null
   where status in ('claimed','running')
     and heartbeat_at is not null
     and heartbeat_at < now() - make_interval(secs => p_heartbeat_timeout_seconds);

  -- We claim jobs lane-by-lane in the provided order
  foreach v_lane in array p_lanes loop

    -- Pull an eligible candidate with SKIP LOCKED, then enforce quota/rate in the same txn
    with candidate as (
      select jq.id
        from public.job_queue jq
       where jq.status = 'queued'
         and jq.lane = v_lane
         and (jq.run_after is null or jq.run_after <= now())
       order by jq.priority desc, jq.created_at asc
       for update skip locked
       limit 1
    )
    select jq.*
      into v_job
      from public.job_queue jq
      join candidate c on c.id = jq.id;

    if not found then
      continue;
    end if;

    -- Quota per user per lane (default row uses user_id_uuid null)
    select q.max_running
      into v_quota
    from public.job_queue_lane_quota q
    where q.lane = v_lane
      and (q.user_id_uuid = v_job.user_id_uuid or q.user_id_uuid is null)
    order by (q.user_id_uuid is not null) desc
    limit 1;

    v_quota := coalesce(v_quota, 1);

    select count(*)::int
      into v_running
    from public.job_queue
    where user_id_uuid is not distinct from v_job.user_id_uuid
      and lane = v_lane
      and status in ('claimed','running');

    if v_running >= v_quota then
      -- Put it back and try next lane (keeps fairness)
      update public.job_queue
         set run_after = coalesce(run_after, now()) + interval '5 seconds'
       where id = v_job.id;
      continue;
    end if;

    -- Rate window (claim throttling)
    select rw.window_seconds, rw.max_claims
      into v_window_seconds, v_max_claims
    from public.job_queue_rate_window rw
    where rw.lane = v_lane
      and (rw.user_id_uuid = v_job.user_id_uuid or rw.user_id_uuid is null)
    order by (rw.user_id_uuid is not null) desc
    limit 1;

    v_window_seconds := coalesce(v_window_seconds, 60);
    v_max_claims := coalesce(v_max_claims, 30);

    select count(*)::int
      into v_claims
    from public.job_queue
    where user_id_uuid is not distinct from v_job.user_id_uuid
      and lane = v_lane
      and claimed_at >= now() - make_interval(secs => v_window_seconds);

    if v_claims >= v_max_claims then
      update public.job_queue
         set run_after = now() + interval '15 seconds'
       where id = v_job.id;
      continue;
    end if;

    -- Claim it
    update public.job_queue
       set status = 'claimed',
           claimed_at = now(),
           claimed_by = p_worker_id,
           heartbeat_at = now()
     where id = v_job.id
     returning * into v_job;

    return v_job;
  end loop;

  return null;
end;
$$;

-- Heartbeat keeps job from being reclaimed
create or replace function public.job_heartbeat(
  p_job_id uuid,
  p_worker_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.job_queue
     set heartbeat_at = now()
   where id = p_job_id
     and claimed_by = p_worker_id
     and status in ('claimed','running');
end;
$$;

-- Complete a job; handles retries/backoff/DLQ; writes execution_runs.
create or replace function public.job_complete(
  p_job_id uuid,
  p_worker_id text,
  p_status text,          -- succeeded|failed|canceled
  p_result jsonb default null,
  p_error jsonb default null
)
returns public.job_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.job_queue;
  v_run_id uuid;
  v_backoff_seconds int;
  v_next_run_after timestamptz;
  v_final_status text;
begin
  select * into v_job
    from public.job_queue
   where id = p_job_id
   for update;

  if not found then
    raise exception 'job not found: %', p_job_id;
  end if;

  -- Mark running window timestamps if not set
  update public.job_queue
     set started_at = coalesce(started_at, now())
   where id = p_job_id;

  -- Create an execution run entry
  insert into public.execution_runs (
    user_id_uuid, owner_user_id,
    job_id, job_type, lane,
    worker_id, attempt, status,
    started_at, ended_at,
    result, error
  )
  values (
    v_job.user_id_uuid, v_job.owner_user_id,
    v_job.id, v_job.job_type, v_job.lane,
    p_worker_id, v_job.attempts, p_status,
    coalesce(v_job.started_at, now()), now(),
    p_result, p_error
  )
  returning id into v_run_id;

  if p_status = 'succeeded' then
    v_final_status := 'succeeded';
    update public.job_queue
       set status = v_final_status,
           finished_at = now(),
           heartbeat_at = null,
           last_result = p_result,
           last_error = null
     where id = p_job_id
     returning * into v_job;

    return v_job;
  end if;

  if p_status = 'canceled' then
    v_final_status := 'canceled';
    update public.job_queue
       set status = v_final_status,
           finished_at = now(),
           heartbeat_at = null,
           last_result = p_result,
           last_error = p_error
     where id = p_job_id
     returning * into v_job;

    return v_job;
  end if;

  -- failed: increment attempts and retry or DLQ
  update public.job_queue
     set attempts = attempts + 1,
         last_error = p_error,
         last_result = p_result
   where id = p_job_id
   returning * into v_job;

  if v_job.attempts >= v_job.max_attempts then
    v_final_status := 'dead_letter';
    update public.job_queue
       set status = v_final_status,
           finished_at = now(),
           heartbeat_at = null
     where id = p_job_id
     returning * into v_job;

    return v_job;
  end if;

  -- exponential backoff: 10s, 30s, 90s, 270s, ...
  v_backoff_seconds := (10 * (3 ^ greatest(v_job.attempts, 0)));
  v_next_run_after := now() + make_interval(secs => v_backoff_seconds);

  update public.job_queue
     set status = 'queued',
         claimed_at = null,
         claimed_by = null,
         heartbeat_at = null,
         started_at = null,
         run_after = v_next_run_after
   where id = p_job_id
   returning * into v_job;

  return v_job;
end;
$$;

commit;
