-- 20251217_job_queue_rpc_lease_any_budgeted.sql
-- Budget-aware atomic scheduler RPC with concurrency caps and lane priority

create or replace function public.job_queue_lease_any_budgeted(
  p_locked_by text,
  p_lock_seconds int default 300,
  p_max_running_per_user int default 3,
  p_default_daily_budget int default 100
)
returns table (
  id uuid,
  user_id uuid,
  job_type text,
  status text,
  run_at timestamptz,
  priority int,
  payload jsonb,
  attempts int,
  max_attempts int,
  correlation_id uuid,
  idempotency_key text
)
language plpgsql
as $$
declare
  v_id uuid;
  v_user_id uuid;
  v_cost int;
  v_today date;
  v_budget_row record;
begin
  -- Get current UTC day
  v_today := (now() at time zone 'utc')::date;

  -- Ensure budget rows exist for all users with queued jobs (upsert)
  insert into public.job_queue_daily_budget (user_id, day, budget, spent)
  select distinct jq.user_id, v_today, p_default_daily_budget, 0
  from public.job_queue jq
  where jq.status = 'queued'
    and jq.run_at <= now()
    and jq.attempts < jq.max_attempts
    and not exists (
      select 1
      from public.job_queue_daily_budget b
      where b.user_id = jq.user_id
        and b.day = v_today
    )
  on conflict (user_id, day) do nothing;

  -- Find the next eligible job with concurrency check and budget check
  -- Lock both job and budget row atomically
  select jq.id, jq.user_id, jq.cost
    into v_id, v_user_id, v_cost
  from public.job_queue jq
  inner join public.job_queue_daily_budget b
    on b.user_id = jq.user_id
    and b.day = v_today
  where jq.status = 'queued'
    and jq.run_at <= now()
    and jq.attempts < jq.max_attempts
    and (
      jq.locked_at is null
      or jq.locked_at < (now() - make_interval(secs => p_lock_seconds))
    )
    -- Concurrency cap: user must have fewer than max_running_per_user running jobs
    and (
      select count(*)
      from public.job_queue jq2
      where jq2.user_id = jq.user_id
        and jq2.status = 'running'
    ) < p_max_running_per_user
    -- Budget check: ensure has enough remaining
    and (b.spent + jq.cost) <= b.budget
  order by
    -- Lane priority: interactive > default > cron
    case jq.lane
      when 'interactive' then 1
      when 'default' then 2
      when 'cron' then 3
      else 4
    end,
    -- Then priority ASC (lower number = higher priority)
    jq.priority asc,
    -- Then run_at ASC
    jq.run_at asc,
    -- Then created_at ASC (FIFO within same priority)
    jq.created_at asc
  for update of jq skip locked
  for update of b
  limit 1;

  if v_id is null then
    return;
  end if;

  -- Get budget row for update (lock it) - double-check budget after lock
  select * into v_budget_row
  from public.job_queue_daily_budget
  where user_id = v_user_id
    and day = v_today
  for update;

  -- Double-check budget (race safety)
  if (v_budget_row.spent + v_cost) > v_budget_row.budget then
    return;
  end if;

  -- Atomically lease the job
  update public.job_queue
  set
    status = 'running',
    started_at = coalesce(started_at, now()),
    locked_at = now(),
    locked_by = p_locked_by,
    updated_at = now()
  where id = v_id;

  -- Increment spent budget
  update public.job_queue_daily_budget
  set
    spent = spent + v_cost,
    updated_at = now()
  where user_id = v_user_id
    and day = v_today;

  -- Insert ledger entry
  insert into public.job_queue_budget_ledger (
    user_id, day, job_id, delta, reason, meta
  )
  values (
    v_user_id,
    v_today,
    v_id,
    v_cost,
    'lease',
    jsonb_build_object(
      'job_type', (select job_type from public.job_queue where id = v_id),
      'lane', (select lane from public.job_queue where id = v_id),
      'locked_by', p_locked_by
    )
  );

  -- Return the leased job
  return query
    select
      jq.id, jq.user_id, jq.job_type, jq.status, jq.run_at, jq.priority,
      jq.payload, jq.attempts, jq.max_attempts, jq.correlation_id, jq.idempotency_key
    from public.job_queue jq
    where jq.id = v_id;
end;
$$;

