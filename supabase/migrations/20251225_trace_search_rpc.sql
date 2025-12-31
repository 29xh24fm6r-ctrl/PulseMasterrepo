begin;

-- Fast lookup already exists:
-- execution_runs(trace_id, started_at) index + execution_logs(trace_id, created_at)

-- ============================================================
-- RPC: Trace search (aggregated)
-- Returns one row per trace_id with summary metrics + involved kinds
-- ============================================================
create or replace function public.rpc_trace_search(
  p_user_id text,
  p_since timestamptz default null,
  p_until timestamptz default null,
  p_kind text default null,
  p_status text default null,         -- "succeeded"|"failed"|"running" etc (run status)
  p_has_error boolean default null,
  p_q text default null,              -- substring match against error or log message
  p_limit int default 50,
  p_offset int default 0
) returns table(
  trace_id uuid,
  first_started_at timestamptz,
  last_finished_at timestamptz,
  run_count int,
  failed_count int,
  last_status text,
  last_error text,
  kinds text
)
language plpgsql
security definer
as $$
begin
  return query
  with runs as (
    select
      r.trace_id,
      r.started_at,
      r.finished_at,
      r.status,
      r.error,
      e.kind
    from public.execution_runs r
    join public.executions e on e.id = r.execution_id
    where r.user_id = p_user_id
      and r.trace_id is not null
      and (p_since is null or r.started_at >= p_since)
      and (p_until is null or r.started_at <= p_until)
      and (p_kind is null or e.kind = p_kind)
      and (p_status is null or r.status = p_status)
      and (p_has_error is null or (p_has_error = true and r.error is not null) or (p_has_error = false and r.error is null))
  ),
  matched as (
    select distinct trace_id from runs
    union
    select distinct l.trace_id
    from public.execution_logs l
    where l.user_id = p_user_id
      and l.trace_id is not null
      and (p_since is null or l.created_at >= p_since)
      and (p_until is null or l.created_at <= p_until)
      and (p_q is not null and l.message ilike ('%' || p_q || '%'))
  ),
  filtered as (
    select r.*
    from runs r
    where (p_q is null)
       or (r.error is not null and r.error ilike ('%' || p_q || '%'))
       or (r.trace_id in (select trace_id from matched))
  ),
  last_run as (
    select distinct on (trace_id)
      trace_id, status as last_status, error as last_error, started_at
    from filtered
    order by trace_id, started_at desc
  )
  select
    f.trace_id,
    min(f.started_at) as first_started_at,
    max(f.finished_at) as last_finished_at,
    count(*)::int as run_count,
    sum(case when f.status = 'failed' then 1 else 0 end)::int as failed_count,
    (select lr.last_status from last_run lr where lr.trace_id = f.trace_id),
    (select lr.last_error from last_run lr where lr.trace_id = f.trace_id),
    string_agg(distinct f.kind, ', ' order by f.kind) as kinds
  from filtered f
  group by f.trace_id
  order by max(f.started_at) desc
  limit greatest(1, least(200, p_limit))
  offset greatest(0, p_offset);
end;
$$;

commit;
