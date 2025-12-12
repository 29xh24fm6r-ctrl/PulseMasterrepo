-- Intervention Engine
-- supabase/migrations/interventions_v1.sql

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,                      -- "grounding_breath", "warrior_activation", etc.
  category text not null,                        -- "emotional_regulation", "focus", "motivation", "relational", etc.
  label text not null,
  description text,
  coach_id text,                                 -- optional preferred coach
  min_duration_seconds int default 60,
  max_duration_seconds int default 600,
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists interventions_category_idx
  on public.interventions (category, active);

create index if not exists interventions_coach_idx
  on public.interventions (coach_id, active);

create table if not exists public.intervention_triggers (
  id uuid primary key default gen_random_uuid(),
  intervention_key text not null references interventions(key) on delete cascade,
  risk_type text,                                -- from behavior_predictions: "stress_spike", "procrastination", etc.
  emotion text,                                  -- "stress", "sad", "angry", "hype", etc.
  coach_id text,                                 -- optional
  pattern_type text,                             -- from power_patterns: "time_of_day", etc.
  pattern_key text,                              -- e.g. "monday_morning"
  min_risk_score numeric,                        -- threshold
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists intervention_triggers_risk_idx
  on public.intervention_triggers (risk_type, active);

create index if not exists intervention_triggers_emotion_idx
  on public.intervention_triggers (emotion, active);

create table if not exists public.intervention_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intervention_key text not null,
  coach_id text,
  trigger_source text,                           -- "prediction", "manual", "meta_coach", etc.
  risk_type text,
  emotion text,
  accepted boolean,
  completed boolean,
  xp_awarded int default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists intervention_executions_user_idx
  on public.intervention_executions (user_id, created_at desc);

-- Insert default interventions
insert into public.interventions (key, category, label, description, coach_id, min_duration_seconds, max_duration_seconds)
values
  ('grounding_breath', 'emotional_regulation', 'Grounding Breath', 'A 60-second breathing exercise to regulate stress and return to center.', 'confidant', 60, 120),
  ('warrior_activation', 'motivation', 'Warrior Activation', 'A 2-minute mental reset to channel energy and overcome resistance.', 'warrior', 120, 180),
  ('focus_reset', 'focus', 'Focus Reset', 'A quick 90-second exercise to clear mental clutter and sharpen focus.', 'executive', 90, 150),
  ('gratitude_moment', 'relational', 'Gratitude Moment', 'A brief reflection to shift perspective and reconnect with what matters.', 'confidant', 60, 120),
  ('energy_boost', 'motivation', 'Energy Boost', 'A quick activation sequence to raise energy and motivation.', 'warrior', 60, 120)
on conflict (key) do nothing;

-- Insert default triggers
insert into public.intervention_triggers (intervention_key, risk_type, emotion, coach_id, min_risk_score)
values
  ('grounding_breath', 'stress_spike', 'stress', null, 0.5),
  ('grounding_breath', 'overwhelm', 'overwhelmed', null, 0.4),
  ('warrior_activation', 'procrastination', null, 'warrior', 0.3),
  ('focus_reset', 'procrastination', null, 'executive', 0.3),
  ('gratitude_moment', 'slump', 'sad', 'confidant', 0.3),
  ('energy_boost', 'slump', 'low', 'warrior', 0.3)
on conflict do nothing;

