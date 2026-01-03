-- 20260103_update_rollup_read_rpc.sql
-- F1) Update RPC to return updated_at for freshness check

create or replace function public.user_daily_activity_rollup_read(
  p_user_id_uuid uuid,
  p_days integer default 30
)
returns table(day date, event_count bigint, updated_at timestamptz)
language sql
security definer
set search_path to 'public'
as $$
  select r.day, r.event_count, r.updated_at
  from public.user_daily_activity_rollups r
  where r.user_id_uuid = p_user_id_uuid
    and r.day >= (current_date - greatest(coalesce(p_days, 30), 1)::int)
  order by r.day asc;
$$;
