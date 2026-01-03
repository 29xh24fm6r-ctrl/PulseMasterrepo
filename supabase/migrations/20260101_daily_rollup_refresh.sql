-- Daily Activity Rollup Writer (RPC + index)
-- Assumes source table: public.activity_events(created_at, user_id_uuid)
-- Target table: public.user_daily_activity_rollup(user_id_uuid, day, event_count, updated_at)

begin;

create index if not exists activity_events_user_day_idx
  on public.activity_events (user_id_uuid, created_at);

create or replace function public.user_daily_activity_rollup_refresh(
  p_user_id uuid default null,
  p_days int default 30
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int := greatest(coalesce(p_days, 30), 1);
begin
  -- Upsert counts for last N days (or all users if p_user_id is null)
  insert into public.user_daily_activity_rollup (user_id_uuid, day, event_count, updated_at)
  select
    ae.user_id_uuid,
    (ae.created_at at time zone 'utc')::date as day,
    count(*)::bigint as event_count,
    now() as updated_at
  from public.activity_events ae
  where ae.created_at >= (now() - (v_days || ' days')::interval)
    and (p_user_id is null or ae.user_id_uuid = p_user_id)
    and ae.user_id_uuid is not null
  group by ae.user_id_uuid, (ae.created_at at time zone 'utc')::date
  on conflict (user_id_uuid, day)
  do update set
    event_count = excluded.event_count,
    updated_at  = excluded.updated_at;

  -- Optional cleanup: remove rollup rows older than window (for the selected user(s))
  delete from public.user_daily_activity_rollup r
  where r.day < (now() - (v_days || ' days')::interval)::date
    and (p_user_id is null or r.user_id_uuid = p_user_id);
end;
$$;

revoke all on function public.user_daily_activity_rollup_refresh(uuid,int) from public;
grant execute on function public.user_daily_activity_rollup_refresh(uuid,int) to service_role;

commit;
