-- 1) Ensure required extension (optional, safe)
create extension if not exists pgcrypto;

-- 2) Ensure activity_events has the minimum shape we need
-- If your activity_events already exists with these columns, this will no-op safely.
alter table if exists public.activity_events
  add column if not exists id uuid primary key default gen_random_uuid();

alter table if exists public.activity_events
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.activity_events
  add column if not exists event_ts timestamptz;

alter table if exists public.activity_events
  add column if not exists user_id uuid;

alter table if exists public.activity_events
  add column if not exists event_name text;

alter table if exists public.activity_events
  add column if not exists event_source text;

alter table if exists public.activity_events
  add column if not exists entity_type text;

alter table if exists public.activity_events
  add column if not exists entity_id text;

alter table if exists public.activity_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists activity_events_user_day_idx
  on public.activity_events (user_id, (date_trunc('day', coalesce(event_ts, created_at))::date));

create index if not exists activity_events_event_name_idx
  on public.activity_events (event_name);

-- 3) Canonical log function (single write path)
create or replace function public.log_activity(
  p_user_id uuid,
  p_event_name text,
  p_event_ts timestamptz default now(),
  p_event_source text default 'api',
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'log_activity: p_user_id is required';
  end if;

  if p_event_name is null or length(trim(p_event_name)) = 0 then
    raise exception 'log_activity: p_event_name is required';
  end if;

  insert into public.activity_events (
    user_id,
    event_name,
    event_ts,
    event_source,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_user_id,
    p_event_name,
    p_event_ts,
    p_event_source,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Allow authenticated callers to execute log_activity (still protected by RLS on activity_events if enabled)
grant execute on function public.log_activity(uuid, text, timestamptz, text, text, text, jsonb) to authenticated;

-- 4) XP event rules (configurable mapping)
create table if not exists public.xp_event_rules (
  event_name text primary key,
  xp_amount int not null,
  is_enabled boolean not null default true
);

-- Default rules (edit to taste)
insert into public.xp_event_rules (event_name, xp_amount, is_enabled)
values
  ('task.completed', 10, true),
  ('quest.claimed', 25, true),
  ('habit.completed', 15, true),
  ('email.sent', 5, true),
  ('session.started', 1, true),
  ('page.view', 0, true)
on conflict (event_name) do update
set xp_amount = excluded.xp_amount,
    is_enabled = excluded.is_enabled;

-- 5) XP ledger (idempotent per activity_event)
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  activity_event_id uuid not null,
  event_name text not null,
  xp_amount int not null,
  created_at timestamptz not null default now(),
  unique (activity_event_id)
);

create index if not exists xp_ledger_user_created_idx
  on public.xp_ledger (user_id, created_at desc);

-- 6) User streaks (daily activity streak)
create table if not exists public.user_streaks (
  user_id uuid primary key,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_day date,
  updated_at timestamptz not null default now()
);

-- 7) Award XP + update streaks (trigger helper)
create or replace function public.activity_event_after_insert_award_xp_and_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp int;
  v_day date;
  v_prev_day date;
  v_current int;
  v_longest int;
begin
  -- If no user_id, do nothing
  if new.user_id is null then
    return new;
  end if;

  -- Determine day for streak logic
  v_day := date_trunc('day', coalesce(new.event_ts, new.created_at))::date;

  -- Award XP if rule exists and enabled
  select r.xp_amount into v_xp
  from public.xp_event_rules r
  where r.event_name = new.event_name
    and r.is_enabled = true
  limit 1;

  if v_xp is not null and v_xp <> 0 then
    insert into public.xp_ledger (user_id, activity_event_id, event_name, xp_amount)
    values (new.user_id, new.id, new.event_name, v_xp)
    on conflict (activity_event_id) do nothing;
  end if;

  -- Update streak (idempotent per-day)
  insert into public.user_streaks (user_id, current_streak, longest_streak, last_active_day)
  values (new.user_id, 1, 1, v_day)
  on conflict (user_id) do nothing;

  select last_active_day, current_streak, longest_streak
    into v_prev_day, v_current, v_longest
  from public.user_streaks
  where user_id = new.user_id;

  -- If we've already counted this day, don't modify streak
  if v_prev_day = v_day then
    update public.user_streaks
    set updated_at = now()
    where user_id = new.user_id;
    return new;
  end if;

  -- If last active day was yesterday, increment; otherwise reset to 1
  if v_prev_day = (v_day - interval '1 day')::date then
    v_current := v_current + 1;
  else
    v_current := 1;
  end if;

  if v_current > v_longest then
    v_longest := v_current;
  end if;

  update public.user_streaks
  set current_streak = v_current,
      longest_streak = v_longest,
      last_active_day = v_day,
      updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

-- 8) Attach trigger to activity_events (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_activity_events_award_xp_streak'
  ) then
    create trigger trg_activity_events_award_xp_streak
    after insert on public.activity_events
    for each row
    execute function public.activity_event_after_insert_award_xp_and_streak();
  end if;
end $$;

-- 9) Optional: Read RPCs for UI (simple + safe)
create or replace function public.user_xp_total(p_user_id uuid)
returns int
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(xp_amount), 0)::int
  from public.xp_ledger
  where user_id = p_user_id;
$$;

grant execute on function public.user_xp_total(uuid) to authenticated;

create or replace function public.user_streak_read(p_user_id uuid)
returns table(
  user_id uuid,
  current_streak int,
  longest_streak int,
  last_active_day date,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select us.user_id, us.current_streak, us.longest_streak, us.last_active_day, us.updated_at
  from public.user_streaks us
  where us.user_id = p_user_id;
$$;

grant execute on function public.user_streak_read(uuid) to authenticated;
