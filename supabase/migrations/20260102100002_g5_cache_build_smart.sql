begin;

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
  existing jsonb;
  existing_stale boolean;
  existing_exp timestamptz;
  v jsonb;
begin
  select c.payload, c.is_stale, c.expires_at
    into existing, existing_stale, existing_exp
  from public.user_daily_signals_cache c
  where c.owner_user_id = p_owner_user_id
    and c.day = d;

  -- Fast return if valid
  if existing is not null
     and coalesce(existing_stale,false) = false
     and (existing_exp is null or existing_exp > now()) then
    return existing;
  end if;

  v := public.user_daily_signals_payload(p_owner_user_id, d, p_days, p_attrib_top_n);

  insert into public.user_daily_signals_cache (owner_user_id, day, payload, payload_version, computed_at, is_stale, expires_at)
  values (p_owner_user_id, d, v, coalesce(p_payload_version, 1), now(), false, now() + interval '12 hours')
  on conflict (owner_user_id, day)
  do update set
    payload = excluded.payload,
    payload_version = excluded.payload_version,
    computed_at = now(),
    is_stale = false,
    expires_at = excluded.expires_at;

  return v;
end;
$$;

revoke all on function public.user_daily_signals_cache_build(text, date, int, int, int) from public;

commit;
