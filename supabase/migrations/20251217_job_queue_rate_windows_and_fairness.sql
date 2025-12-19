-- 20251217_job_queue_rate_windows_and_fairness.sql
-- Rate windows + lane quotas + fairness ledger for C5 scheduler

-- Rate window table (rolling window caps per user)
create table if not exists public.job_queue_rate_window (
  user_id uuid not null references public.users(id) on delete cascade,
  window_start timestamptz not null,
  window_seconds int not null,
  limit int not null,
  spent int not null default 0,
  updated_at timestamptz not null default now(),
  
  primary key (user_id, window_start, window_seconds)
);

create index if not exists idx_job_queue_rate_window_user_start
  on public.job_queue_rate_window (user_id, window_start desc);

-- Lane quota table (per-user per-day per-lane quotas)
create table if not exists public.job_queue_lane_quota (
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null,
  lane text not null,
  quota int not null,
  spent int not null default 0,
  updated_at timestamptz not null default now(),
  
  primary key (user_id, day, lane)
);

create index if not exists idx_job_queue_lane_quota_user_day
  on public.job_queue_lane_quota (user_id, day);

-- Fairness ledger (audit trail for rate windows, quotas, starvation)
create table if not exists public.job_queue_fairness_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid null references public.job_queue(id) on delete set null,
  lane text not null,
  ts timestamptz not null default now(),
  event text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_job_queue_fairness_ledger_lane_ts
  on public.job_queue_fairness_ledger (lane, ts desc);

create index if not exists idx_job_queue_fairness_ledger_user_ts
  on public.job_queue_fairness_ledger (user_id, ts desc);

