-- 20260102_g5_full_series_rpcs.sql
-- Full continuity history RPCs (series-filled) for XP, Momentum, Life Score
-- Service-role only: p_owner_user_id is explicit (Clerk-safe)
-- Outputs a row for every day in range even if missing in base table.

begin;

-- =========================================================
-- XP full series
-- =========================================================
create or replace function public.user_daily_xp_history_full(
  p_owner_user_id text,
  p_days int default 30,
  p_end_day date default null
)
returns table(day date, xp numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_days int := greatest(coalesce(p_days, 30), 1);
  v_end date := coalesce(p_end_day, now()::date);
  v_start date := v_end - (v_days - 1);
begin
  return query
  select
    d.day,
    coalesce(x.xp, 0)::numeric as xp
  from generate_series(v_start, v_end, interval '1 day') as d(day)
  left join public.user_daily_xp x
    on x.owner_user_id = p_owner_user_id
   and x.day = d.day
  order by d.day asc;
end;
$$;

-- =========================================================
-- Momentum full series
-- =========================================================
create or replace function public.user_daily_momentum_history_full(
  p_owner_user_id text,
  p_days int default 30,
  p_end_day date default null
)
returns table(day date, momentum numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_days int := greatest(coalesce(p_days, 30), 1);
  v_end date := coalesce(p_end_day, now()::date);
  v_start date := v_end - (v_days - 1);
begin
  return query
  select
    d.day,
    coalesce(m.momentum, 50)::numeric as momentum
  from generate_series(v_start, v_end, interval '1 day') as d(day)
  left join public.user_daily_momentum m
    on m.owner_user_id = p_owner_user_id
   and m.day = d.day
  order by d.day asc;
end;
$$;

-- =========================================================
-- Life Score full series
-- =========================================================
create or replace function public.user_daily_life_score_history_full(
  p_owner_user_id text,
  p_days int default 30,
  p_end_day date default null
)
returns table(day date, life_score numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_days int := greatest(coalesce(p_days, 30), 1);
  v_end date := coalesce(p_end_day, now()::date);
  v_start date := v_end - (v_days - 1);
begin
  return query
  select
    d.day,
    coalesce(l.life_score, 0)::numeric as life_score
  from generate_series(v_start, v_end, interval '1 day') as d(day)
  left join public.user_daily_life_score l
    on l.owner_user_id = p_owner_user_id
   and l.day = d.day
  order by d.day asc;
end;
$$;

-- =========================================================
-- LOCKDOWN: service-role only
-- =========================================================
revoke all on function public.user_daily_xp_history_full(text, int, date) from public;
revoke all on function public.user_daily_momentum_history_full(text, int, date) from public;
revoke all on function public.user_daily_life_score_history_full(text, int, date) from public;

commit;
