begin;

-- =========================================================
-- 1) Reply draft send state + linkage to outbox
-- =========================================================
alter table public.reply_drafts
  add column if not exists to_email text,
  add column if not exists cc text,
  add column if not exists bcc text,
  add column if not exists send_at timestamptz,
  add column if not exists outbox_id uuid, -- links to email_outbox.id
  add column if not exists provider_message_id text,
  add column if not exists last_error text;

-- one outbox per draft (prevents duplicate sends)
create unique index if not exists uq_reply_drafts_outbox_id
  on public.reply_drafts (user_id_uuid, outbox_id)
  where outbox_id is not null;

-- =========================================================
-- 2) Work Scoreboard (daily execution stats)
-- =========================================================
create table if not exists public.work_scoreboard_days (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,
  day date not null,

  inbox_done_count int not null default 0,
  tasks_done_count int not null default 0,
  followups_done_count int not null default 0,
  replies_sent_count int not null default 0,
  autopilot_actions_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id_uuid, day)
);

drop trigger if exists trg_work_scoreboard_days_set_updated_at on public.work_scoreboard_days;
create trigger trg_work_scoreboard_days_set_updated_at
before update on public.work_scoreboard_days
for each row execute function public.tg_set_updated_at();

alter table public.work_scoreboard_days enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='work_scoreboard_days' and policyname='work_scoreboard_days_owner_all') then
    execute 'drop policy work_scoreboard_days_owner_all on public.work_scoreboard_days';
  end if;
end $$;

create policy work_scoreboard_days_owner_all
on public.work_scoreboard_days
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

create index if not exists idx_work_scoreboard_days_user_day
  on public.work_scoreboard_days (user_id_uuid, day desc);

-- =========================================================
-- 3) Daily Brief snapshots (generated summaries)
-- =========================================================
create table if not exists public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,
  day date not null,

  title text not null default 'Daily Brief',
  content text not null default '',
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (user_id_uuid, day)
);

alter table public.daily_briefs enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='daily_briefs' and policyname='daily_briefs_owner_all') then
    execute 'drop policy daily_briefs_owner_all on public.daily_briefs';
  end if;
end $$;

create policy daily_briefs_owner_all
on public.daily_briefs
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

create index if not exists idx_daily_briefs_user_day
  on public.daily_briefs (user_id_uuid, day desc);

commit;
