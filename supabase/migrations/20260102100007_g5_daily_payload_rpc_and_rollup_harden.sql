-- 20260102_g5_daily_payload_rpc_and_rollup_harden.sql
-- 1) Adds a single "daily payload" RPC that returns:
--    - today's xp/momentum/life_score
--    - history bundle (gapless)
--    - nudges (undismissed)
--    - alerts
--    - attribution (top N)
-- 2) Hardens compute_rollup (timezone-safe boundaries; inclusive end date behavior)

begin;

-- =========================================================
-- A) Harden compute_rollup
-- =========================================================
-- Key changes:
-- - Treat p_start_date and p_end_date as DATEs in the user's local-day sense.
-- - Compute timestamp range as [start_date, end_date + 1 day) using date arithmetic.
-- - Avoid ambiguous casts by explicitly building timestamptz boundaries.
-- - Maintain dynamic SQL but make it planner- and timezone-safer.

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
  v_start date := coalesce(p_start_date, now()::date);
  v_end date := coalesce(p_end_date, now()::date);
begin
  if v_end < v_start then
    raise exception 'Invalid date range: end (%) < start (%)', v_end, v_start;
  end if;

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
  -- NOTE: We use timestamp boundaries that are stable:
  --   >= start::timestamptz AND < (end + 1)::timestamptz
  v_sql := format($fmt$
    insert into public.rollup_values (rollup_key, owner_user_id, window_start, value)
    select
      %L as rollup_key,
      %I as owner_user_id,
      date_trunc(%L, %I)::date as window_start,
      %s as value
    from %I
    where %I >= (%L::date)::timestamptz
      and %I < ((%L::date + 1)::timestamptz)
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
    r.timestamp_column, v_start,
    r.timestamp_column, v_end
  );

  execute v_sql;
end;
$$;

revoke all on function public.compute_rollup(text, date, date) from public;

-- =========================================================
-- B) Daily Payload RPC (single call)
-- =========================================================
-- Returns:
-- - day + todays xp/momentum/life_score
-- - history bundle (gapless) (xp,momentum,life_score)
-- - nudges (undismissed)
-- - alerts (for day)
-- - attribution (top_n)
--
-- Implemented as RETURNS JSONB to avoid multiple result sets.
-- Service-role only (takes p_owner_user_id explicitly, Clerk-safe)

create or replace function public.user_daily_signals_payload(
  p_owner_user_id text,
  p_day date default null,
  p_days int default 30,
  p_attrib_top_n int default 8
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
  days int := greatest(least(coalesce(p_days, 30), 120), 1);
  topn int := greatest(least(coalesce(p_attrib_top_n, 8), 25), 1);

  v_xp numeric := 0;
  v_mom numeric := 50;
  v_ls numeric := 0;

  hist jsonb := '[]'::jsonb;
  nudges jsonb := '[]'::jsonb;
  alerts jsonb := '[]'::jsonb;
  attrib jsonb := '[]'::jsonb;
begin
  -- Today metrics
  select coalesce(x.xp,0) into v_xp
  from public.user_daily_xp x
  where x.owner_user_id = p_owner_user_id and x.day = d;

  select coalesce(m.momentum,50) into v_mom
  from public.user_daily_momentum m
  where m.owner_user_id = p_owner_user_id and m.day = d;

  select coalesce(l.life_score,0) into v_ls
  from public.user_daily_life_score l
  where l.owner_user_id = p_owner_user_id and l.day = d;

  -- History bundle (gapless)
  select coalesce(jsonb_agg(to_jsonb(t) order by t.day), '[]'::jsonb)
    into hist
  from public.user_daily_signals_history_bundle(p_owner_user_id, days, d) t;

  -- Nudges (undismissed)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', un.id,
        'day', un.day,
        'nudge_key', un.nudge_key,
        'title', un.title,
        'body', un.body,
        'severity', un.severity,
        'shown_at', un.shown_at,
        'dismissed_at', un.dismissed_at,
        'created_at', un.created_at
      )
      order by un.created_at desc
    ),
    '[]'::jsonb
  )
  into nudges
  from public.user_nudges un
  where un.owner_user_id = p_owner_user_id
    and un.day = d
    and un.dismissed_at is null;

  -- Alerts
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sa.id,
        'day', sa.day,
        'rollup_key', sa.rollup_key,
        'risk', sa.risk,
        'reason', sa.reason,
        'sent_at', sa.sent_at,
        'created_at', sa.created_at
      )
      order by sa.created_at desc
    ),
    '[]'::jsonb
  )
  into alerts
  from public.streak_alerts sa
  where sa.owner_user_id = p_owner_user_id
    and sa.day = d;

  -- Attribution (join rollup_values + weights; top N)
  with raw as (
    select
      rv.rollup_key,
      rv.value::numeric as value,
      coalesce(w.xp_per_unit, 0)::numeric as weight,
      (rv.value::numeric) * coalesce(w.xp_per_unit, 0)::numeric as contribution
    from public.rollup_values rv
    join public.rollup_xp_weights w
      on w.rollup_key = rv.rollup_key
     and w.is_active = true
    where rv.owner_user_id = p_owner_user_id
      and rv.window_start = d
      and coalesce(w.xp_per_unit, 0) > 0
  ),
  tot as (
    select greatest(coalesce(sum(contribution),0), 1) as total
    from raw
  ),
  ranked as (
    select
      r.*,
      (r.contribution / t.total) as contribution_pct
    from raw r
    cross join tot t
    order by r.contribution desc
    limit topn
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rollup_key', rollup_key,
        'value', value,
        'weight', weight,
        'contribution', contribution,
        'contribution_pct', contribution_pct
      )
      order by contribution desc
    ),
    '[]'::jsonb
  )
  into attrib
  from ranked;

  return jsonb_build_object(
    'day', d,
    'xp', v_xp,
    'momentum', v_mom,
    'life_score', v_ls,
    'history', hist,
    'nudges', nudges,
    'alerts', alerts,
    'attribution', attrib
  );
end;
$$;

revoke all on function public.user_daily_signals_payload(text, date, int, int) from public;

commit;
