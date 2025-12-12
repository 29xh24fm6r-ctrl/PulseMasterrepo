-- Coach Engine v2.5 Expansion Migration
-- Extends v2 with scenario library, preferences, and enhanced feedback

-- 1. Scenario Library Table
create table if not exists coach_scenarios (
  id uuid primary key default gen_random_uuid(),
  coach_type text not null, -- e.g. 'sales', 'loan', 'negotiation'
  title text not null,
  description text,
  difficulty text not null default 'beginner', -- 'beginner' | 'intermediate' | 'advanced' | 'expert'
  topic_tags text[] default '{}', -- e.g. '{pricing, vehicle, objection_handling}'
  customer_profile jsonb, -- demographic, style, motives
  constraints jsonb, -- rules of the scenario: budget, timeline, must-haves, etc.
  initial_prompt text, -- short setup text for the user
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_scenarios_coach_type_idx on coach_scenarios (coach_type, difficulty);
create index if not exists coach_scenarios_tags_idx on coach_scenarios using gin (topic_tags);

-- 2. Extend Training Sessions Table
alter table coach_training_sessions
  add column if not exists difficulty text default 'beginner',
  add column if not exists performance_score numeric(5,2), -- 0–100
  add column if not exists feedback_summary jsonb; -- stores structured feedback from v2 engine

-- 3. User Coach Preferences Table
create table if not exists coach_user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  coach_type text not null, -- 'sales', 'loan', etc.
  tone text not null default 'supportive', -- 'supportive' | 'direct' | 'drill_sergeant' | 'calm'
  difficulty_pref text default 'auto', -- 'auto' | 'beginner' | 'intermediate' | 'advanced' | 'expert'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, coach_type)
);

create index if not exists coach_user_preferences_user_idx on coach_user_preferences (user_id, coach_type);

