-- 20251217_job_queue_budgets.sql
-- Budget tracking tables for per-user daily execution limits

-- Daily budget table (one row per user per day)
create table if not exists public.job_queue_daily_budget (
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null,
  budget int not null default 100,
  spent int not null default 0,
  updated_at timestamptz not null default now(),
  
  primary key (user_id, day)
);

create index if not exists idx_job_queue_daily_budget_user_day
  on public.job_queue_daily_budget (user_id, day);

-- Budget ledger (audit trail)
create table if not exists public.job_queue_budget_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null,
  job_id uuid null references public.job_queue(id) on delete set null,
  delta int not null,
  reason text not null,
  meta jsonb not null default '{}'::jsonb,
  ts timestamptz not null default now()
);

create index if not exists idx_job_queue_budget_ledger_user_day_ts
  on public.job_queue_budget_ledger (user_id, day, ts desc);

