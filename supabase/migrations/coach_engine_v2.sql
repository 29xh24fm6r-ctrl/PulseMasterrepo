-- Coach Engine v2 + Roleplay Engine v2 Migration
-- Creates tables for training sessions and roleplay scenarios

-- Training sessions table
create table if not exists coach_training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  coach_id text not null,                          -- e.g. 'sales', 'career', 'relationship'
  scenario_type text not null,                     -- e.g. 'sales:vehicle_price_objection'
  skill_nodes text[] default '{}',                 -- e.g. ['objection_clarify', 'value_framing']
  success_rating int,                              -- 1–5 user rating
  llm_difficulty text,                              -- 'easy' | 'normal' | 'hard'
  transcript jsonb,                                -- array of {role, content}
  key_takeaways text,
  created_at timestamptz default now()
);

create index if not exists coach_training_sessions_user_idx
  on coach_training_sessions (user_id, coach_id, created_at desc);

-- Roleplay scenarios table (optional, for reusable templates)
create table if not exists coach_roleplay_scenarios (
  id uuid primary key default gen_random_uuid(),
  coach_id text not null,                          -- 'sales'
  scenario_type text not null,                     -- 'sales:vehicle_price_objection'
  name text not null,                              -- 'Vehicle Price Objection – SUV'
  config jsonb not null,                           -- RoleplayScenario object
  is_default boolean default false,
  created_at timestamptz default now()
);

create unique index if not exists coach_roleplay_scenarios_unique_default
  on coach_roleplay_scenarios (coach_id, scenario_type)
  where is_default = true;

