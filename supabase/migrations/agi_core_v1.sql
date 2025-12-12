-- AGI Core v1 - Multi-Agent Reasoning System
-- supabase/migrations/agi_core_v1.sql

create table if not exists agi_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  trigger jsonb not null,
  world_snapshot jsonb not null,
  agent_results jsonb not null,
  final_plan jsonb not null
);

create index if not exists agi_runs_user_id_idx on agi_runs(user_id);
create index if not exists agi_runs_started_at_idx on agi_runs(started_at);

create table if not exists agi_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agi_runs(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  action jsonb not null,
  status text not null default 'planned', -- 'planned' | 'executed' | 'skipped' | 'failed'
  executed_at timestamptz,
  error text
);

create index if not exists agi_actions_user_id_idx on agi_actions(user_id);
create index if not exists agi_actions_status_idx on agi_actions(status);
create index if not exists agi_actions_run_id_idx on agi_actions(run_id);

create table if not exists user_agi_settings (
  user_id uuid primary key references users(id) on delete cascade,
  level text not null default 'assist', -- 'off' | 'assist' | 'autopilot'
  max_actions_per_run int not null default 10,
  max_runs_per_day int not null default 12,
  require_confirmation_for_high_impact boolean not null default true,
  last_updated_at timestamptz not null default now()
);

create table if not exists agi_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  enabled boolean not null default true,
  trigger jsonb not null, -- e.g., { "type": "schedule", "cron": "0 * * * *" } or event-based
  created_at timestamptz not null default now()
);

create index if not exists agi_policies_user_id_idx on agi_policies(user_id);
create index if not exists agi_policies_enabled_idx on agi_policies(enabled);



