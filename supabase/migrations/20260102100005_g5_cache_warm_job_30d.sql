-- 20260102_g5_cache_warm_job_30d.sql
-- Adds:
-- 1) Candidate user picker based on canon_events + cache presence
-- 2) DB-side warm function that rebuilds stale/missing cache rows for a user across a date range
--
-- Assumptions:
-- - public.canon_events has owner_user_id (text)
-- - canon_events has occurred_at OR created_at (timestamptz)
-- - public.user_daily_signals_cache exists with is_stale, expires_at, payload_version, etc.
-- - public.user_daily_signals_cache_build(...) exists and is "smart" (skips recompute when fresh)

begin;

-- =========================================================
-- A) Candidate user selection (active users)
-- =========================================================
-- Strategy:
-- - Users with canon_events activity in last N days
-- - PLUS users already having cache rows in last N days (covers users with cached data but no new events today)
-- Returned as a stable list with paging.

create or replace function public.signals_cache_warm_candidates(
  p_days int default 30,
  p_limit int default 500,
  p_offset int default 0
)
returns table(owner_user_id text)
language sql
security definer
set search_path to 'public'
as $$
  with params as (
    select
      greatest(coalesce(p_days, 30), 1) as days,
      greatest(least(coalesce(p_limit, 500), 5000), 1) as lim,
      greatest(coalesce(p_offset, 0), 0) as off
  ),
  from_events as (
    select distinct ce.owner_user_id
    from public.canon_events ce, params p
    where ce.owner_user_id is not null
      and coalesce(ce.occurred_at, ce.created_at, now()) >= now() - make_interval(days => p.days)
  ),
  from_cache as (
    select distinct c.owner_user_id
    from public.user_daily_signals_cache c, params p
    where c.owner_user_id is not null
      and c.day >= (now()::date - (p.days - 1))
  ),
  all_users as (
    select owner_user_id from from_events
    union
    select owner_user_id from from_cache
  )
  select owner_user_id
  from all_users, params p
  order by owner_user_id
  limit p.lim offset p.off;
$$;

revoke all on function public.signals_cache_warm_candidates(int, int, int) from public;

-- =========================================================
-- B) Warm range for a single user (DB-side loop)
-- =========================================================
-- Rebuilds cache rows for each day in [start_day, end_day] ONLY if:
-- - missing, OR
-- - is_stale = true, OR
-- - expires_at passed
--
-- Uses user_daily_signals_cache_build() which should already be smart/skip when fresh.
-- Returns number of days actually rebuilt.

create or replace function public.user_daily_signals_cache_warm_range(
  p_owner_user_id text,
  p_start_day date,
  p_end_day date,
  p_days_for_payload int default 30,
  p_attrib_top_n int default 8,
  p_payload_version int default 1
)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  s date := coalesce(p_start_day, (now()::date - 29));
  e date := coalesce(p_end_day, now()::date);
  d date;
  rebuilt int := 0;
  cur record;
begin
  if p_owner_user_id is null or length(p_owner_user_id) = 0 then
    return 0;
  end if;

  if e < s then
    raise exception 'Invalid range: end (%) < start (%)', e, s;
  end if;

  d := s;

  while d <= e loop
    -- Check if rebuild is needed
    select c.is_stale, c.expires_at
      into cur
    from public.user_daily_signals_cache c
    where c.owner_user_id = p_owner_user_id
      and c.day = d;

    if not found then
      perform public.user_daily_signals_cache_build(
        p_owner_user_id,
        d,
        p_days_for_payload,
        p_attrib_top_n,
        p_payload_version
      );
      rebuilt := rebuilt + 1;
    else
      if coalesce(cur.is_stale, false) = true
         or (cur.expires_at is not null and cur.expires_at <= now()) then
        perform public.user_daily_signals_cache_build(
          p_owner_user_id,
          d,
          p_days_for_payload,
          p_attrib_top_n,
          p_payload_version
        );
        rebuilt := rebuilt + 1;
      end if;
    end if;

    d := d + 1;
  end loop;

  return rebuilt;
end;
$$;

revoke all on function public.user_daily_signals_cache_warm_range(text, date, date, int, int, int) from public;

commit;
