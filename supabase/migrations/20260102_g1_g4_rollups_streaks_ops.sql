-- 20260102_g1_g4_rollups_streaks_ops.sql
-- G4: generalized rollup engine
-- G2: streaks
-- G3: job metrics
-- Notes:
-- - Avoid reserved keyword "window" -> use rollup_window
-- - SECURITY DEFINER functions must be locked down via grants (service role only)

begin;

-- =========
-- G4: rollup_definitions
-- =========
create table if not exists public.rollup_definitions (
  id uuid primary key default gen_random_uuid(),
  rollup_key text not null unique,
  source_table text not null,
  timestamp_column text not null default 'created_at',
  user_id_column text not null default 'owner_user_id',
  rollup_window text not null check (rollup_window in ('daily','weekly','monthly')),
  aggregation text not null check (aggregation in ('count','sum','avg')),
  value_column text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========
-- G4: rollup_values
-- =========
create table if not exists public.rollup_values (
  rollup_key text not null,
  owner_user_id text not null,
  window_start date not null,
  value numeric not null,
  computed_at timestamptz not null default now(),
  primary key (rollup_key, owner_user_id, window_start)
);

create index if not exists rollup_values_owner_window_idx
  on public.rollup_values (owner_user_id, window_start desc);

create index if not exists rollup_values_key_window_idx
  on public.rollup_values (rollup_key, window_start desc);

-- =========
-- G4: compute_rollup RPC
-- =========
create or replace function public.compute_rollup(
  p_rollup_key text,
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.rollup_definitions;
  v_agg_expr text;
  v_sql text;
begin
  select *
    into r
  from public.rollup_definitions
  where rollup_key = p_rollup_key
    and is_active = true;

  if not found then
    raise exception 'Rollup not found or inactive: %', p_rollup_key;
  end if;

  -- Guard rails
  if r.aggregation <> 'count' and (r.value_column is null or length(r.value_column)=0) then
    raise exception 'value_column required for aggregation % on rollup_key %', r.aggregation, r.rollup_key;
  end if;

  -- Aggregation expression
  if r.aggregation = 'count' then
    v_agg_expr := 'count(*)::numeric';
  else
    v_agg_expr := format('%s(%I)::numeric', r.aggregation, r.value_column);
  end if;

  -- Dynamic upsert
  v_sql := format($fmt$
    insert into public.rollup_values (rollup_key, owner_user_id, window_start, value)
    select
      %L as rollup_key,
      %I as owner_user_id,
      date_trunc(%L, %I)::date as window_start,
      %s as value
    from %I
    where %I >= %L::date
      and %I < (%L::date + interval '1 day')
    group by 1, 2, 3
    on conflict (rollup_key, owner_user_id, window_start)
    do update set
      value = excluded.value,
      computed_at = now()
  $fmt$,
    r.rollup_key,
    r.user_id_column,
    r.rollup_window,
    r.timestamp_column,
    v_agg_expr,
    r.source_table,
    r.timestamp_column,
    r.timestamp_column, p_start_date,
    r.timestamp_column, p_end_date
  );

  execute v_sql;
end;
$$;

-- =========
-- G2: user_streaks
-- =========
create table if not exists public.user_streaks (
  owner_user_id text not null,
  rollup_key text not null,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, rollup_key)
);

create index if not exists user_streaks_updated_idx
  on public.user_streaks (updated_at desc);

-- =========
-- G2: update_streak RPC
-- =========
create or replace function public.update_streak(
  p_owner_user_id text,
  p_rollup_key text,
  p_activity_date date
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  s public.user_streaks;
begin
  select *
    into s
  from public.user_streaks
  where owner_user_id = p_owner_user_id
    and rollup_key = p_rollup_key;

  if not found then
    insert into public.user_streaks (
      owner_user_id, rollup_key, current_streak, longest_streak, last_active_date
    )
    values (p_owner_user_id, p_rollup_key, 1, 1, p_activity_date);
    return;
  end if;

  if s.last_active_date is not null and s.last_active_date = (p_activity_date - 1) then
    update public.user_streaks
    set current_streak = s.current_streak + 1,
        longest_streak = greatest(s.longest_streak, s.current_streak + 1),
        last_active_date = p_activity_date,
        updated_at = now()
    where owner_user_id = p_owner_user_id
      and rollup_key = p_rollup_key;
  else
    update public.user_streaks
    set current_streak = 1,
        longest_streak = greatest(s.longest_streak, 1),
        last_active_date = p_activity_date,
        updated_at = now()
    where owner_user_id = p_owner_user_id
      and rollup_key = p_rollup_key;
  end if;
end;
$$;

-- =========
-- G3: job_metrics
-- =========
create table if not exists public.job_metrics (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  run_at timestamptz not null default now(),
  duration_ms int not null,
  success boolean not null,
  error text
);

create index if not exists job_metrics_job_run_idx
  on public.job_metrics (job_name, run_at desc);

-- =========
-- G3: job_health_summary RPC
-- =========
create or replace function public.job_health_summary()
returns table (
  job_name text,
  runs bigint,
  failures bigint,
  avg_duration_ms numeric
)
language sql
security definer
set search_path to 'public'
as $$
  select
    job_name,
    count(*) as runs,
    count(*) filter (where not success) as failures,
    avg(duration_ms)::numeric as avg_duration_ms
  from public.job_metrics
  where run_at > now() - interval '24 hours'
  group by job_name
  order by failures desc, avg_duration_ms desc;
$$;

-- =========
-- Lockdown (service role only) for SECURITY DEFINER RPCs
-- =========
revoke all on function public.compute_rollup(text, date, date) from public;
revoke all on function public.update_streak(text, text, date) from public;
revoke all on function public.job_health_summary() from public;

-- (Optional) If you have a dedicated role for server runtime:
-- grant execute on function public.compute_rollup(text, date, date) to service_role;
-- grant execute on function public.update_streak(text, text, date) to service_role;
-- grant execute on function public.job_health_summary() to service_role;

commit;
