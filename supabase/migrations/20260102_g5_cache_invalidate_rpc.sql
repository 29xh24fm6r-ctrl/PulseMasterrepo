begin;

create or replace function public.user_daily_signals_cache_invalidate(
  p_owner_user_id text,
  p_day date default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
begin
  update public.user_daily_signals_cache
  set is_stale = true
  where owner_user_id = p_owner_user_id
    and day = d;
end;
$$;

revoke all on function public.user_daily_signals_cache_invalidate(text, date) from public;

commit;
