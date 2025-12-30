begin;

-- ------------------------------------------------------------
-- 1) XP events ledger (canonical audit trail)
-- ------------------------------------------------------------
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null, -- e.g. "task_complete", "focus_complete"
  xp int not null,
  ref_table text null,
  ref_id uuid null,
  meta jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.xp_events is 'Canonical XP ledger: append-only events for scoring and streaks.';

create index if not exists xp_events_user_time_idx
  on public.xp_events (user_id, occurred_at desc);

create index if not exists xp_events_ref_idx
  on public.xp_events (ref_table, ref_id);

-- ------------------------------------------------------------
-- 2) XP state table (fast read for UI)
-- ------------------------------------------------------------
create table if not exists public.xp_state (
  user_id text primary key,
  total_xp bigint not null default 0,
  today_xp int not null default 0,
  streak_days int not null default 0,
  streak_last_day date null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.xp_state is 'Derived XP totals and streak state for fast UI.';

create index if not exists xp_state_total_idx
  on public.xp_state (total_xp desc);

-- updated_at trigger (reuse your canonical function if present)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at') then
    create or replace function public.set_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at := now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end $$;

drop trigger if exists trg_xp_state_updated_at on public.xp_state;
create trigger trg_xp_state_updated_at
before update on public.xp_state
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------
alter table public.xp_events enable row level security;
alter table public.xp_state  enable row level security;

-- If you're using Supabase auth.uid() in this project, keep these.
-- If you're fully Clerk-only with server writes (supabaseAdmin), RLS is future-hardening.
drop policy if exists "xp_events_select_own" on public.xp_events;
create policy "xp_events_select_own"
on public.xp_events
for select
using (auth.uid()::text = user_id);

drop policy if exists "xp_state_select_own" on public.xp_state;
create policy "xp_state_select_own"
on public.xp_state
for select
using (auth.uid()::text = user_id);

-- ------------------------------------------------------------
-- 4) Award function: atomic XP + streak update
-- ------------------------------------------------------------
create or replace function public.award_xp(
  p_user_id text,
  p_event_type text,
  p_xp int,
  p_ref_table text default null,
  p_ref_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns public.xp_state
language plpgsql
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_state public.xp_state;
  v_last date;
  v_streak int;
begin
  -- Append ledger
  insert into public.xp_events (user_id, event_type, xp, ref_table, ref_id, meta)
  values (p_user_id, p_event_type, p_xp, p_ref_table, p_ref_id, coalesce(p_meta, '{}'::jsonb));

  -- Ensure xp_state row exists
  insert into public.xp_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_state
  from public.xp_state
  where user_id = p_user_id
  for update;

  v_last := v_state.streak_last_day;
  v_streak := v_state.streak_days;

  -- Streak logic:
  -- If first activity ever -> streak=1
  -- If same day -> streak unchanged
  -- If yesterday -> streak +=1
  -- Else -> streak resets to 1
  if v_last is null then
    v_streak := 1;
  elsif v_last = v_today then
    v_streak := v_streak;
  elsif v_last = (v_today - 1) then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  -- Today XP resets if day changed
  if v_last is null or v_last <> v_today then
    update public.xp_state
    set
      total_xp = total_xp + p_xp,
      today_xp = p_xp,
      streak_days = v_streak,
      streak_last_day = v_today
    where user_id = p_user_id;
  else
    update public.xp_state
    set
      total_xp = total_xp + p_xp,
      today_xp = today_xp + p_xp,
      streak_days = v_streak,
      streak_last_day = v_today
    where user_id = p_user_id;
  end if;

  select * into v_state from public.xp_state where user_id = p_user_id;
  return v_state;
end;
$$;

commit;
