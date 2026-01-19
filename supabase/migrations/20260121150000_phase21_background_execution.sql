create table pulse_daily_runs (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null,

  run_date date not null,
  run_type text not null, -- 'cron' | 'app_open' | 'manual_retry'

  status text not null, -- 'started' | 'completed' | 'skipped' | 'blocked' | 'failed'

  ipp_reason text,
  failure_reason text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  unique (owner_user_id, run_date)
);

create index on pulse_daily_runs (owner_user_id);
create index on pulse_daily_runs (run_date);
