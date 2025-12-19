-- 20251217_job_queue_recover_stuck.sql
-- RPC to recover jobs stuck in 'running' state with expired locks

create or replace function public.job_queue_recover_stuck(
  p_lock_age_seconds int default 600
)
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  -- Atomically update stuck jobs
  with stuck as (
    update public.job_queue
    set
      status = 'queued',
      run_at = now(),
      locked_at = null,
      locked_by = null,
      finished_at = null,
      started_at = null,
      last_error = 'Recovered stuck job',
      updated_at = now()
    where status = 'running'
      and locked_at is not null
      and locked_at < (now() - make_interval(secs => p_lock_age_seconds))
    returning id
  )
  select count(*) into v_count from stuck;

  return v_count;
end;
$$;

