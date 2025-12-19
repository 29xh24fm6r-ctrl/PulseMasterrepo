-- Sprint 2: Tasks, Deals, Habits, Journal - Supabase-only tables
-- Migration: 20241216_sprint2_tasks_deals_habits_journal.sql
-- Purpose: Create Supabase tables for tasks, deals, habits, and journal entries

-- ============================================================================
-- 1. TASKS
-- ============================================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  notes text,
  status text not null default 'open', -- open | done | archived
  priority int default 2, -- 1 high, 2 normal, 3 low
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_status on public.tasks (user_id, status);
create index if not exists idx_tasks_user_due on public.tasks (user_id, due_date);
create index if not exists idx_tasks_user_id on public.tasks (user_id);

-- updated_at trigger
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) then
    create or replace function public.set_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_tasks_set_updated_at') then
    create trigger trg_tasks_set_updated_at
      before update on public.tasks
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- ============================================================================
-- 2. DEALS
-- ============================================================================

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  company text,
  amount numeric,
  stage text not null default 'prospect', -- prospect | qualified | underwriting | won | lost
  close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deals_user_stage on public.deals (user_id, stage);
create index if not exists idx_deals_user_close_date on public.deals (user_id, close_date);
create index if not exists idx_deals_user_id on public.deals (user_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_deals_set_updated_at') then
    create trigger trg_deals_set_updated_at
      before update on public.deals
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- ============================================================================
-- 3. HABITS
-- ============================================================================

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  frequency text not null default 'daily', -- daily | weekly
  target int not null default 1,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  habit_id uuid not null references public.habits(id) on delete cascade,
  occurred_on date not null,
  count int not null default 1,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_habit_logs_unique
  on public.habit_logs (user_id, habit_id, occurred_on);

create index if not exists idx_habits_user_active on public.habits (user_id, is_active);
create index if not exists idx_habit_logs_user_date on public.habit_logs (user_id, occurred_on);
create index if not exists idx_habit_logs_habit_id on public.habit_logs (habit_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_habits_set_updated_at') then
    create trigger trg_habits_set_updated_at
      before update on public.habits
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- ============================================================================
-- 4. JOURNAL
-- ============================================================================

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entry_date date not null default (now()::date),
  title text,
  content text not null,
  mood int, -- optional 1-10
  tags text[], -- optional
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_journal_user_date on public.journal_entries (user_id, entry_date);
create index if not exists idx_journal_user_id on public.journal_entries (user_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_journal_entries_set_updated_at') then
    create trigger trg_journal_entries_set_updated_at
      before update on public.journal_entries
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- Comments for documentation
COMMENT ON TABLE public.tasks IS 'User tasks - Supabase-only (migrated from Notion)';
COMMENT ON TABLE public.deals IS 'Sales deals - Supabase-only (migrated from Notion)';
COMMENT ON TABLE public.habits IS 'User habits - Supabase-only (migrated from Notion)';
COMMENT ON TABLE public.habit_logs IS 'Habit completion logs';
COMMENT ON TABLE public.journal_entries IS 'Journal entries - Supabase-only (migrated from Notion)';

