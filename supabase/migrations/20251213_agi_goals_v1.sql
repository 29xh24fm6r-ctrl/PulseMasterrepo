-- ============================================
-- PULSE AGI GOALS V1
-- Goals + Progress Tracking
-- ============================================

create table if not exists public.agi_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  -- Short label: "Stabilize email backlog", "Reduce rollover", etc.
  title text not null,

  -- Rich description / rationale
  description text,

  -- Domain: 'work' | 'finance' | 'relationships' | 'health' | 'personal_growth' | etc.
  domain text not null,

  -- Source: 'agi' | 'user'
  source text not null default 'agi',

  -- Status: 'active' | 'completed' | 'abandoned' | 'paused'
  status text not null default 'active',

  -- Time horizon in days (7, 30, 90, etc.)
  horizon_days int not null default 30,

  -- Optional: When this goal should start / end
  start_date date,
  target_date date,

  -- JSON config for how progress is computed
  -- Example: { "metric": "task_rollover_reduction", "baseline": 15, "target": 5 }
  config jsonb not null default '{}'::jsonb,

  -- Identity/values link, e.g. ["Family","Mastery"]
  identity_tags text[] default array[]::text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agi_goals_user_id_idx on public.agi_goals(user_id);
create index if not exists agi_goals_status_idx on public.agi_goals(status);
create index if not exists agi_goals_domain_idx on public.agi_goals(domain);

-- Progress log for each goal
create table if not exists public.agi_goal_progress (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.agi_goals(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,

  -- A numeric scalar, e.g. % complete, or metric value (e.g. backlog count)
  value numeric,

  -- Optional normalized 0–1 progress (for UI)
  progress numeric,

  -- Freeform note / summary
  note text,

  -- Snapshot date (e.g. when the metric was observed)
  snapshot_date date not null default (current_date),

  created_at timestamptz not null default now()
);

create index if not exists agi_goal_progress_goal_id_idx
  on public.agi_goal_progress(goal_id);

create index if not exists agi_goal_progress_user_id_idx
  on public.agi_goal_progress(user_id);


