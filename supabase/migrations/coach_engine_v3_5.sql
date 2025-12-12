-- Coach Engine v3.5 Full Expansion Migration
-- Multi-Agent, Voice, Scenario Generation, XP Integration, Analytics

-- ============================================
-- EXPANSION A: Multi-Agent Team Coaching
-- ============================================

create table if not exists coach_multi_agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scenario_id uuid references coach_scenarios(id),
  agents text[] not null default '{}', -- e.g. ['sales', 'negotiation', 'emotional']
  transcript jsonb not null default '[]',
  agent_contributions jsonb, -- stores per-agent advice/interventions
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_multi_agent_sessions_user_idx 
  on coach_multi_agent_sessions (user_id, created_at desc);

-- ============================================
-- EXPANSION B: Real-Time Voice Coaching
-- ============================================

create table if not exists coach_voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  transcript text,
  audio_url text, -- S3/Storage URL if stored
  coaching_summary jsonb, -- structured coaching insights
  sentiment_curve jsonb, -- array of {timestamp, sentiment, intensity}
  patterns_detected jsonb, -- interruptions, filler words, pacing, etc.
  created_at timestamptz not null default now()
);

create index if not exists coach_voice_sessions_user_idx 
  on coach_voice_sessions (user_id, created_at desc);

-- ============================================
-- EXPANSION C: AI Auto-Generated Scenarios
-- ============================================

create table if not exists coach_generated_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  input_prompt text not null,
  generated_scenario jsonb not null, -- full CoachScenario object
  difficulty_rating text, -- 'beginner' | 'intermediate' | 'advanced' | 'expert'
  quality_score numeric(5,2), -- 0-100, LLM self-assessment
  created_at timestamptz not null default now()
);

create index if not exists coach_generated_scenarios_user_idx 
  on coach_generated_scenarios (user_id, created_at desc);

-- ============================================
-- EXPANSION D: XP Integration (extends existing)
-- ============================================

-- Add XP tracking to training sessions if not already present
alter table coach_training_sessions
  add column if not exists xp_awarded jsonb, -- {dxp: 50, pxp: 30, ...}
  add column if not exists belt_progression jsonb; -- {path: 'sales', level: 3}

-- ============================================
-- EXPANSION E: Analytics (no new tables, uses existing)
-- ============================================

-- Analytics will query existing tables:
-- - coach_training_sessions
-- - coach_multi_agent_sessions
-- - coach_voice_sessions
-- - coach_generated_scenarios
-- - xp_ledger (if exists)

