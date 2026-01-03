-- 20260102_g5_daily_payload_cache.sql
-- Materialized daily payload cache for /api/signals/daily
-- Stores one JSON blob per user per day.

begin;

-- =========================================================
-- A) Cache table
-- =========================================================
create table if not exists public.user_daily_signals_cache (
  owner_user_id text not null,
  day date not null,
  payload jsonb not null,
  payload_version int not null default 1,
  computed_at timestamptz not null default now(),
  primary key (owner_user_id, day)
);

create index if not exists user_daily_signals_cache_owner_day_idx
  on public.user_daily_signals_cache (owner_user_id, day desc);

-- =========================================================
-- B) Builder RPC: writes cache by calling existing payload generator
-- =========================================================
-- Requires existing:
--   public.user_daily_signals_payload(p_owner_user_id, p_day, p_days, p_attrib_top_n) returns jsonb
create or replace function public.user_daily_signals_cache_build(
  p_owner_user_id text,
  p_day date default null,
  p_days int default 30,
  p_attrib_top_n int default 8,
  p_payload_version int default 1
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
  v jsonb;
begin
  v := public.user_daily_signals_payload(p_owner_user_id, d, p_days, p_attrib_top_n);

  insert into public.user_daily_signals_cache (owner_user_id, day, payload, payload_version)
  values (p_owner_user_id, d, v, coalesce(p_payload_version, 1))
  on conflict (owner_user_id, day)
  do update set
    payload = excluded.payload,
    payload_version = excluded.payload_version,
    computed_at = now();

  return v;
end;
$$;

-- =========================================================
-- C) Reader RPC: fetches cache (fast path)
-- =========================================================
create or replace function public.user_daily_signals_cache_read(
  p_owner_user_id text,
  p_day date default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
  v jsonb;
begin
  select c.payload
    into v
  from public.user_daily_signals_cache c
  where c.owner_user_id = p_owner_user_id
    and c.day = d;

  return v;
end;
$$;

-- =========================================================
-- LOCKDOWN: service-only
-- =========================================================
revoke all on table public.user_daily_signals_cache from public;
revoke all on function public.user_daily_signals_cache_build(text, date, int, int, int) from public;
revoke all on function public.user_daily_signals_cache_read(text, date) from public;

commit;
