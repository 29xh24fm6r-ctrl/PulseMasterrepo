-- 20251217_job_queue_rpc_lease_next.sql
-- Atomic job leasing RPC function (per-user scoped)

create or replace function public.job_queue_lease_next(
  p_user_id uuid,
  p_locked_by text,
  p_lock_seconds int default 300
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
begin
  select jq.id
    into v_id
  from public.job_queue jq
  where jq.user_id = p_user_id
    and jq.status = 'queued'
    and jq.run_at <= now()
    and jq.attempts < jq.max_attempts
    and (
      jq.locked_at is null
      or jq.locked_at < (now() - make_interval(secs => p_lock_seconds))
    )
  order by jq.priority asc, jq.run_at asc, jq.created_at asc
  for update skip locked
  limit 1;

  if v_id is null then
    return;
  end if;

  update public.job_queue
  set
    status = 'running',
    started_at = coalesce(started_at, now()),
    locked_at = now(),
    locked_by = p_locked_by,
    updated_at = now()
  where id = v_id;

  return query
    select
      jq.id, jq.user_id, jq.job_type, jq.status, jq.run_at, jq.priority,
      jq.payload, jq.attempts, jq.max_attempts, jq.correlation_id, jq.idempotency_key
    from public.job_queue jq
    where jq.id = v_id;
end;
$$;

