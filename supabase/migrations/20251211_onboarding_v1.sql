-- Onboarding & User Focus Profile Schema
-- supabase/migrations/20251211_onboarding_v1.sql

-- Track onboarding completion state
create table if not exists user_onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  has_completed_core boolean default false,
  has_seen_life_tour boolean default false,
  has_seen_work_tour boolean default false,
  has_seen_finance_tour boolean default false,
  has_seen_relationships_tour boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User focus profile (what season they're in)
create table if not exists user_focus_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_focus text,          -- 'healing', 'career', 'performance', 'money', 'relationships', 'balance', etc.
  secondary_focus text,
  self_description text,       -- freeform answer like "What brings you to Pulse?"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User dashboard preferences (which strips/panels to show)
create table if not exists user_dashboard_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  show_tasks_focus boolean default true,
  show_money_snapshot boolean default true,
  show_relationships boolean default true,
  show_strategy_xp boolean default true,
  show_energy_mood boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists user_onboarding_state_user_idx on user_onboarding_state(user_id);
create index if not exists user_focus_profile_user_idx on user_focus_profile(user_id);
create index if not exists user_dashboard_preferences_user_idx on user_dashboard_preferences(user_id);




