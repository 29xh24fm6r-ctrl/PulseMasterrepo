-- 20260102_B3_daily_activity_rollup_refresh.sql
-- A) DB foundation: persistent daily rollups + refresh RPC
-- Safe to run multiple times.

begin;

-- 1) Rollup storage (persistent)
create table if not exists public.user_daily_activity_rollups (
  user_id_uuid uuid not null,
  day date not null,
  event_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id_uuid, day)
);

create index if not exists user_daily_activity_rollups_user_day_idx
  on public.user_daily_activity_rollups (user_id_uuid, day);

-- 2) Refresh RPC: compute day count from canon_events and upsert
-- Assumes canon_events has: user_id_uuid uuid, created_at timestamptz default now()
create or replace function public.user_daily_activity_rollup_refresh(
  p_user_id_uuid uuid,
  p_day date
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count bigint := 0;
begin
  if p_user_id_uuid is null or p_day is null then
    return;
  end if;

  select count(*)
    into v_count
  from public.canon_events ce
  where ce.user_id_uuid = p_user_id_uuid
    and ce.created_at::date = p_day;

  insert into public.user_daily_activity_rollups (user_id_uuid, day, event_count, updated_at)
  values (p_user_id_uuid, p_day, v_count, now())
  on conflict (user_id_uuid, day)
  do update set
    event_count = excluded.event_count,
    updated_at = now();
end;
$$;

-- 3) Read RPC (optional but convenient): last N days for a user
create or replace function public.user_daily_activity_rollup_read(
  p_user_id_uuid uuid,
  p_days integer default 30
)
returns table(day date, event_count bigint)
language sql
security definer
set search_path to 'public'
as $$
  select r.day, r.event_count
  from public.user_daily_activity_rollups r
  where r.user_id_uuid = p_user_id_uuid
    and r.day >= (current_date - greatest(coalesce(p_days, 30), 1)::int)
  order by r.day asc;
$$;

-- 4) Permissions + RLS
alter table public.user_daily_activity_rollups enable row level security;

-- Lock it down: service_role only, unless you later decide to allow user reads via RPC only.
do $$
begin
  -- Remove any permissive policies if they exist (best effort)
  begin
    execute 'drop policy if exists "read_own_rollups" on public.user_daily_activity_rollups';
  exception when others then null;
  end;

  begin
    execute 'drop policy if exists "write_service_only" on public.user_daily_activity_rollups';
  exception when others then null;
  end;
end$$;

-- Service role can do everything (matches your internal tables posture)
create policy "service_role_all"
on public.user_daily_activity_rollups
as permissive
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

commit;
