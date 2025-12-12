-- Persona Engine v5 - Companion Intelligence Layer
-- supabase/migrations/20251211_persona_engine_v5.sql

-- 1.1 Persona Companion State
CREATE TABLE IF NOT EXISTS persona_companion_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  coach_id text,                          -- optional, for coach-specific companion
  warmth_score int NOT NULL DEFAULT 50,   -- 0–100
  trust_score int NOT NULL DEFAULT 50,    -- 0–100
  familiarity_score int NOT NULL DEFAULT 50, -- 0–100
  last_interaction_at timestamptz,
  total_interactions int NOT NULL DEFAULT 0,
  bond_level text DEFAULT 'acquaintance', -- 'acquaintance' | 'ally' | 'trusted' | 'deep'
  flags text[] DEFAULT '{}',              -- e.g. '{grief_mode, burnout_watch}'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS persona_companion_state_unique
  ON persona_companion_state(user_id, persona_id, COALESCE(coach_id, 'global'));

CREATE INDEX IF NOT EXISTS persona_companion_state_user_idx
  ON persona_companion_state(user_id, bond_level, updated_at DESC);

-- 1.2 Persona Companion Events
CREATE TABLE IF NOT EXISTS persona_companion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  coach_id text,
  event_type text NOT NULL,         -- 'first_share', 'big_win', 'setback', 'grief', 'arc_milestone'
  title text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',         -- 'career', 'relationship', 'health', etc.
  emotion_state text,               -- snapshot from Emotion OS
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persona_companion_events_user_idx
  ON persona_companion_events(user_id, persona_id, created_at DESC);

CREATE INDEX IF NOT EXISTS persona_companion_events_type_idx
  ON persona_companion_events(event_type, created_at DESC);

-- 1.3 Persona Companion Highlights
CREATE TABLE IF NOT EXISTS persona_companion_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  coach_id text,
  highlight_type text NOT NULL,      -- 'win', 'struggle', 'insight', 'promise', 'pattern'
  summary text NOT NULL,             -- short, safe, non-creepy summary
  importance int NOT NULL DEFAULT 1, -- 1–5
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persona_companion_highlights_user_idx
  ON persona_companion_highlights(user_id, persona_id, importance DESC, created_at DESC);

-- Limit to top 50 per persona (enforced in application logic)
-- CREATE INDEX IF NOT EXISTS persona_companion_highlights_limit_idx
--   ON persona_companion_highlights(user_id, persona_id, importance DESC, created_at DESC)
--   WHERE id IN (SELECT id FROM persona_companion_highlights ORDER BY importance DESC, created_at DESC LIMIT 50);

-- 1.4 Persona Microstyle Preferences
CREATE TABLE IF NOT EXISTS persona_microstyle_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  coach_id text,
  nickname text,                     -- optional, e.g. "Matt" vs "Matthew" vs "Legend"
  preferred_address text,            -- 'first_name', 'no_name', 'formal', etc.
  forbidden_phrases text[] DEFAULT '{}',
  favorite_phrases text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS persona_microstyle_prefs_unique
  ON persona_microstyle_prefs(user_id, persona_id, COALESCE(coach_id, 'global'));




