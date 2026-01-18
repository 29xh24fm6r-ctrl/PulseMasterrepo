begin;

-- Helpful index for time-window scans
create index if not exists idx_execution_runs_user_started
  on public.execution_runs (user_id, started_at desc);

-- ============================================================
-- RPC: Drift radar per kind (compare baseline vs recent)
-- baseline_days defaults 7, recent_hours defaults 6
-- ============================================================
create or replace function public.rpc_execution_drift_radar(
  p_user_id text,
  p_kind text default null,
  p_baseline_days int default 7,
  p_recent_hours int default 6
) returns table(
  kind text,

  baseline_runs int,
  baseline_failures int,
  baseline_failure_rate numeric,
  baseline_p95_duration_ms numeric,

  recent_runs int,
  recent_failures int,
  recent_failure_rate numeric,
  recent_p95_duration_ms numeric,

  drift_failure_rate_delta numeric,
  drift_p95_duration_delta_ms numeric
)
language sql
security definer
as $$
with base as (
  select
    e.kind,
    (extract(epoch from (r.finished_at - r.started_at)) * 1000.0) as duration_ms,
    (case when r.status = 'failed' then 1 else 0 end) as is_failed
  from public.execution_runs r
  join public.executions e on e.id = r.execution_id
  where r.user_id = p_user_id
    and r.started_at >= now() - make_interval(days => p_baseline_days)
    and r.finished_at is not null
    and (p_kind is null or e.kind = p_kind)
),
recent as (
  select
    e.kind,
    (extract(epoch from (r.finished_at - r.started_at)) * 1000.0) as duration_ms,
    (case when r.status = 'failed' then 1 else 0 end) as is_failed
  from public.execution_runs r
  join public.executions e on e.id = r.execution_id
  where r.user_id = p_user_id
    and r.started_at >= now() - make_interval(hours => p_recent_hours)
    and r.finished_at is not null
    and (p_kind is null or e.kind = p_kind)
),
base_agg as (
  select
    kind,
    count(*)::int as runs,
    sum(is_failed)::int as failures,
    (sum(is_failed)::numeric / nullif(count(*),0)) as failure_rate,
    percentile_cont(0.95) within group (order by duration_ms) as p95_ms
  from base
  group by kind
),
recent_agg as (
  select
    kind,
    count(*)::int as runs,
    sum(is_failed)::int as failures,
    (sum(is_failed)::numeric / nullif(count(*),0)) as failure_rate,
    percentile_cont(0.95) within group (order by duration_ms) as p95_ms
  from recent
  group by kind
)
select
  coalesce(b.kind, r.kind) as kind,

  coalesce(b.runs, 0) as baseline_runs,
  coalesce(b.failures, 0) as baseline_failures,
  coalesce(b.failure_rate, 0) as baseline_failure_rate,
  coalesce(b.p95_ms, 0) as baseline_p95_duration_ms,

  coalesce(r.runs, 0) as recent_runs,
  coalesce(r.failures, 0) as recent_failures,
  coalesce(r.failure_rate, 0) as recent_failure_rate,
  coalesce(r.p95_ms, 0) as recent_p95_duration_ms,

  (coalesce(r.failure_rate, 0) - coalesce(b.failure_rate, 0)) as drift_failure_rate_delta,
  (coalesce(r.p95_ms, 0) - coalesce(b.p95_ms, 0)) as drift_p95_duration_delta_ms
from base_agg b
full outer join recent_agg r using (kind)
order by abs((coalesce(r.failure_rate,0) - coalesce(b.failure_rate,0))) desc,
         abs((coalesce(r.p95_ms,0) - coalesce(b.p95_ms,0))) desc;
$$;

commit;
