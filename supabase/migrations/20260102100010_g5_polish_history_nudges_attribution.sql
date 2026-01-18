-- 20260102_g5_polish_history_nudges_attribution.sql
-- Adds:
-- - History RPCs for sparklines (modified to accept owner_user_id for Service Role use)
-- - Nudge mark_shown + dismiss RPCs (modified to accept owner_user_id)
-- - Attribution RPCs

begin;

-- =========================================================
-- A) HISTORY RPCs (Sparkline-ready)
-- =========================================================

create or replace function public.user_daily_xp_history(p_owner_user_id text, p_days int default 30)
returns table(day date, xp numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_days int := greatest(coalesce(p_days, 30), 1);
begin
  return query
  select d.day, coalesce(x.xp, 0) as xp
  from generate_series((now()::date - (v_days - 1)), now()::date, interval '1 day') as d(day)
  left join public.user_daily_xp x
    on x.day = d.day
   and x.owner_user_id = p_owner_user_id;
end;
$$;

create or replace function public.user_daily_momentum_history(p_owner_user_id text, p_days int default 30)
returns table(day date, momentum numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_days int := greatest(coalesce(p_days, 30), 1);
begin
  return query
  select d.day, coalesce(m.momentum, 50) as momentum
  from generate_series((now()::date - (v_days - 1)), now()::date, interval '1 day') as d(day)
  left join public.user_daily_momentum m
    on m.day = d.day
   and m.owner_user_id = p_owner_user_id;
end;
$$;

create or replace function public.user_daily_life_score_history(p_owner_user_id text, p_days int default 30)
returns table(day date, life_score numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_days int := greatest(coalesce(p_days, 30), 1);
begin
  return query
  select d.day, coalesce(l.life_score, 0) as life_score
  from generate_series((now()::date - (v_days - 1)), now()::date, interval '1 day') as d(day)
  left join public.user_daily_life_score l
    on l.day = d.day
   and l.owner_user_id = p_owner_user_id;
end;
$$;

revoke all on function public.user_daily_xp_history(text, int) from public;
revoke all on function public.user_daily_momentum_history(text, int) from public;
revoke all on function public.user_daily_life_score_history(text, int) from public;

-- =========================================================
-- B) NUDGE UX RPCs (mark_shown + dismiss)
-- =========================================================

create or replace function public.nudge_mark_shown(p_nudge_id uuid, p_owner_user_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.user_nudges
  set shown_at = coalesce(shown_at, now())
  where id = p_nudge_id
    and owner_user_id = p_owner_user_id;
end;
$$;

create or replace function public.nudge_dismiss(p_nudge_id uuid, p_owner_user_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.user_nudges
  set dismissed_at = now()
  where id = p_nudge_id
    and owner_user_id = p_owner_user_id;
end;
$$;

revoke all on function public.nudge_mark_shown(uuid, text) from public;
revoke all on function public.nudge_dismiss(uuid, text) from public;

-- =========================================================
-- C) ATTRIBUTION: "What moved my score today?"
-- =========================================================

create or replace function public.life_score_attribution(p_owner_user_id text, p_day date default null)
returns table(
  day date,
  rollup_key text,
  value numeric,
  weight numeric,
  contribution numeric,
  contribution_pct numeric
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
  total numeric := 0;
begin
  -- total weighted contribution
  select coalesce(sum((rv.value::numeric) * w.xp_per_unit), 0)
    into total
  from public.rollup_values rv
  join public.rollup_xp_weights w
    on w.rollup_key = rv.rollup_key
   and w.is_active = true
  where rv.owner_user_id = p_owner_user_id
    and rv.window_start = d
    and w.xp_per_unit > 0;

  return query
  with c as (
    select
      d as day,
      rv.rollup_key,
      rv.value::numeric as value,
      w.xp_per_unit as weight,
      (rv.value::numeric) * w.xp_per_unit as contribution
    from public.rollup_values rv
    join public.rollup_xp_weights w
      on w.rollup_key = rv.rollup_key
     and w.is_active = true
    where rv.owner_user_id = p_owner_user_id
      and rv.window_start = d
      and w.xp_per_unit > 0
  )
  select
    day,
    rollup_key,
    value,
    weight,
    contribution,
    case when total > 0 then (contribution / total) else 0 end as contribution_pct
  from c
  order by contribution desc;
end;
$$;

revoke all on function public.life_score_attribution(text, date) from public;

commit;
