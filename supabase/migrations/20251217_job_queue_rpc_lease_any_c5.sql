-- 20251217_job_queue_rpc_lease_any_c5.sql
-- C5 Scheduler: Atomic lease with rate windows, lane quotas, anti-starvation

create or replace function public.job_queue_lease_any_c5(
  p_locked_by text,
  p_lock_seconds int default 300,
  p_max_running_per_user int default 3,
  p_default_daily_budget int default 100,
  p_window_seconds int default 3600,
  p_window_limit int default 30,
  p_lane_quota_interactive int default 60,
  p_lane_quota_default int default 30,
  p_lane_quota_cron int default 10,
  p_starvation_seconds int default 600,
  p_starvation_boost int default 50
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
  v_lane text;
  v_today date;
  v_window_start timestamptz;
  v_budget_row record;
  v_rate_window_row record;
  v_lane_quota_row record;
  v_wait_seconds int;
begin
  -- Get current UTC day
  v_today := (now() at time zone 'utc')::date;

  -- Calculate window start (bucket aligned to window_seconds)
  -- Align to window_seconds boundaries (e.g., if window_seconds=3600, align to hour boundaries)
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  -- Ensure budget rows exist for all users with queued jobs
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

  -- Ensure rate window rows exist
  insert into public.job_queue_rate_window (user_id, window_start, window_seconds, limit, spent)
  select distinct jq.user_id, v_window_start, p_window_seconds, p_window_limit, 0
  from public.job_queue jq
  where jq.status = 'queued'
    and jq.run_at <= now()
    and jq.attempts < jq.max_attempts
    and not exists (
      select 1
      from public.job_queue_rate_window rw
      where rw.user_id = jq.user_id
        and rw.window_start = v_window_start
        and rw.window_seconds = p_window_seconds
    )
  on conflict (user_id, window_start, window_seconds) do nothing;

  -- Ensure lane quota rows exist
  insert into public.job_queue_lane_quota (user_id, day, lane, quota, spent)
  select distinct 
    jq.user_id, 
    v_today, 
    jq.lane,
    case jq.lane
      when 'interactive' then p_lane_quota_interactive
      when 'default' then p_lane_quota_default
      when 'cron' then p_lane_quota_cron
      else p_lane_quota_default
    end,
    0
  from public.job_queue jq
  where jq.status = 'queued'
    and jq.run_at <= now()
    and jq.attempts < jq.max_attempts
    and not exists (
      select 1
      from public.job_queue_lane_quota lq
      where lq.user_id = jq.user_id
        and lq.day = v_today
        and lq.lane = jq.lane
    )
  on conflict (user_id, day, lane) do nothing;

  -- Find the next eligible job with ALL constraints
  -- Calculate wait time for starvation boost
  select 
    jq.id, 
    jq.user_id, 
    jq.cost,
    jq.lane,
    extract(epoch from (now() - least(jq.created_at, jq.run_at)))::int as wait_seconds
    into v_id, v_user_id, v_cost, v_lane, v_wait_seconds
  from public.job_queue jq
  inner join public.job_queue_daily_budget b
    on b.user_id = jq.user_id
    and b.day = v_today
  inner join public.job_queue_rate_window rw
    on rw.user_id = jq.user_id
    and rw.window_start = v_window_start
    and rw.window_seconds = p_window_seconds
  inner join public.job_queue_lane_quota lq
    on lq.user_id = jq.user_id
    and lq.day = v_today
    and lq.lane = jq.lane
  where jq.status = 'queued'
    and jq.run_at <= now()
    and jq.attempts < jq.max_attempts
    and (
      jq.locked_at is null
      or jq.locked_at < (now() - make_interval(secs => p_lock_seconds))
    )
    -- Concurrency cap
    and (
      select count(*)
      from public.job_queue jq2
      where jq2.user_id = jq.user_id
        and jq2.status = 'running'
    ) < p_max_running_per_user
    -- Daily budget check
    and (b.spent + jq.cost) <= b.budget
    -- Rate window check
    and (rw.spent + jq.cost) <= rw.limit
    -- Lane quota check
    and (lq.spent + jq.cost) <= lq.quota
  order by
    -- Lane priority: interactive > default > cron
    case jq.lane
      when 'interactive' then 1
      when 'default' then 2
      when 'cron' then 3
      else 4
    end,
    -- Starvation boost: if wait_seconds > threshold, boost by reducing effective priority
    (jq.priority - case
      when extract(epoch from (now() - least(jq.created_at, jq.run_at))) > p_starvation_seconds
      then p_starvation_boost
      else 0
    end) asc,
    -- Then original priority
    jq.priority asc,
    -- Then run_at
    jq.run_at asc,
    -- Then created_at
    jq.created_at asc
  for update of jq skip locked
  for update of b
  for update of rw
  for update of lq
  limit 1;

  if v_id is null then
    return;
  end if;

  -- Double-check all constraints after lock (race safety)
  select * into v_budget_row
  from public.job_queue_daily_budget
  where user_id = v_user_id
    and day = v_today
  for update;

  select * into v_rate_window_row
  from public.job_queue_rate_window
  where user_id = v_user_id
    and window_start = v_window_start
    and window_seconds = p_window_seconds
  for update;

  select * into v_lane_quota_row
  from public.job_queue_lane_quota
  where user_id = v_user_id
    and day = v_today
    and lane = v_lane
  for update;

  -- Final checks
  if (v_budget_row.spent + v_cost) > v_budget_row.budget then
    return;
  end if;

  if (v_rate_window_row.spent + v_cost) > v_rate_window_row.limit then
    return;
  end if;

  if (v_lane_quota_row.spent + v_cost) > v_lane_quota_row.quota then
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

  -- Increment all spend counters
  update public.job_queue_daily_budget
  set
    spent = spent + v_cost,
    updated_at = now()
  where user_id = v_user_id
    and day = v_today;

  update public.job_queue_rate_window
  set
    spent = spent + v_cost,
    updated_at = now()
  where user_id = v_user_id
    and window_start = v_window_start
    and window_seconds = p_window_seconds;

  update public.job_queue_lane_quota
  set
    spent = spent + v_cost,
    updated_at = now()
  where user_id = v_user_id
    and day = v_today
    and lane = v_lane;

  -- Write ledger entries
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
      'lane', v_lane,
      'locked_by', p_locked_by
    )
  );

  insert into public.job_queue_fairness_ledger (
    user_id, job_id, lane, event, meta
  )
  values (
    v_user_id,
    v_id,
    v_lane,
    'lease',
    jsonb_build_object(
      'rate_window_spent', v_rate_window_row.spent + v_cost,
      'lane_quota_spent', v_lane_quota_row.spent + v_cost,
      'wait_seconds', v_wait_seconds,
      'starvation_boost_applied', case when v_wait_seconds > p_starvation_seconds then true else false end,
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

