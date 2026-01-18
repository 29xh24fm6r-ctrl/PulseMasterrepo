begin;

create table if not exists public.daily_quests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  quest_date date not null, -- UTC day
  quest_key text not null,  -- stable key e.g. "complete_3_tasks"
  title text not null,
  description text null,

  target int not null default 1,
  progress int not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz null,

  reward_xp int not null default 25,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.daily_quests is 'Daily quest missions generated per user per day.';
comment on column public.daily_quests.quest_key is 'Stable quest identifier for idempotent generation.';
comment on column public.daily_quests.meta is 'Quest-specific config and evidence.';

create unique index if not exists daily_quests_unique_day_key
  on public.daily_quests (user_id, quest_date, quest_key);

create index if not exists daily_quests_user_day_idx
  on public.daily_quests (user_id, quest_date desc);

drop trigger if exists trg_daily_quests_updated_at on public.daily_quests;
create trigger trg_daily_quests_updated_at
before update on public.daily_quests
for each row execute function public.set_updated_at();

-- RLS (future-hardening)
alter table public.daily_quests enable row level security;

drop policy if exists "daily_quests_select_own" on public.daily_quests;
create policy "daily_quests_select_own"
on public.daily_quests
for select
using (auth.uid()::text = user_id);

commit;
