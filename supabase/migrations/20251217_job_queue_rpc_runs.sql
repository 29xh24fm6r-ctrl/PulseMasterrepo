-- 20251217_job_queue_rpc_runs.sql
-- RPC to group jobs by correlation_id for Control Plane v2

create or replace function public.job_queue_runs(
  p_user_id uuid,
  p_limit int default 50
)
returns table (
  correlation_id uuid,
  last_ts timestamptz,
  queued int,
  running int,
  succeeded int,
  failed int
)
language plpgsql
as $$
begin
  return query
  select
    jq.correlation_id,
    max(jq.created_at) as last_ts,
    count(*) filter (where jq.status = 'queued')::int as queued,
    count(*) filter (where jq.status = 'running')::int as running,
    count(*) filter (where jq.status = 'succeeded')::int as succeeded,
    count(*) filter (where jq.status = 'failed')::int as failed
  from public.job_queue jq
  where jq.user_id = p_user_id
    and jq.correlation_id is not null
  group by jq.correlation_id
  order by max(jq.created_at) desc
  limit p_limit;
end;
$$;

