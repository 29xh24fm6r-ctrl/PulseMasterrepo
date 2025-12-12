-- Power Patterns + Behavior Prediction + Identity Resonance
-- supabase/migrations/power_patterns_v1.sql

-- Power Patterns Table
create table if not exists public.power_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern_type text not null,                -- "time_of_day", "weekday", "context_tag", "coach", "identity"
  key text not null,                         -- e.g. "monday_morning", "sales_coach", "deep_work", "warrior"
  emotion_dominant text,                     -- e.g. "stress", "hype", "sad", "calm"
  emotion_score numeric,                     -- how strong the correlation is (0-1)
  positive_behavior text[],                  -- array of strings, e.g. ['completed_tasks', 'journaling']
  negative_behavior text[],                  -- e.g. ['avoidance', 'doomscrolling']
  confidence numeric default 0.0,            -- 0–1
  sample_size int default 0,                 -- number of events feeding this pattern
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists power_patterns_user_idx
  on public.power_patterns (user_id, pattern_type, confidence desc);

create index if not exists power_patterns_key_idx
  on public.power_patterns (user_id, key);

-- Behavior Predictions Table
create table if not exists public.behavior_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prediction_date date not null,             -- date this prediction applies to
  window_start timestamptz not null,         -- prediction window
  window_end timestamptz not null,
  context text,                              -- "calendar_event", "task_block", "generic"
  context_id text,                           -- event_id, task_id, etc. (nullable)
  risk_type text,                            -- "stress_spike", "procrastination", "overwhelm", "burnout", "slump"
  risk_score numeric,                        -- 0–1
  recommended_action text,                   -- short suggestion like "pre-block 15min wind-down"
  created_at timestamptz default now()
);

create index if not exists behavior_predictions_user_date_idx
  on public.behavior_predictions (user_id, prediction_date, window_start);

create index if not exists behavior_predictions_risk_idx
  on public.behavior_predictions (user_id, risk_type, risk_score desc);

-- Identity Resonance Links Table
create table if not exists public.identity_resonance_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_id uuid,                          -- FK to identity table if available
  identity_name text,                        -- fallback if identity_id not available
  source_type text not null,                 -- "task", "goal", "pattern", "coach_session", "coach_turn"
  source_id text not null,                   -- id from that source
  resonance_score numeric,                   -- 0–1 (how strongly this maps to identity)
  context_tags text[],                       -- tags that triggered resonance
  created_at timestamptz default now()
);

create index if not exists identity_resonance_user_idx
  on public.identity_resonance_links (user_id, source_type, resonance_score desc);

create index if not exists identity_resonance_identity_idx
  on public.identity_resonance_links (user_id, identity_name);

