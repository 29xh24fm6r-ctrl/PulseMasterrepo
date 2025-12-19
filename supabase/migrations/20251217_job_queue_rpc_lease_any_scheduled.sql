-- 20251217_job_queue_rpc_lease_any_scheduled.sql
-- Atomic scheduler RPC with concurrency caps and lane priority

create or replace function public.job_queue_lease_any_scheduled(
  p_locked_by text,
  p_lock_seconds int default 300,
  p_max_running_per_user int default 3
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
begin
  -- Find the next eligible job with concurrency check
  select jq.id, jq.user_id
    into v_id, v_user_id
  from public.job_queue jq
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
  for update skip locked
  limit 1;

  if v_id is null then
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

  -- Return the leased job
  return query
    select
      jq.id, jq.user_id, jq.job_type, jq.status, jq.run_at, jq.priority,
      jq.payload, jq.attempts, jq.max_attempts, jq.correlation_id, jq.idempotency_key
    from public.job_queue jq
    where jq.id = v_id;
end;
$$;

