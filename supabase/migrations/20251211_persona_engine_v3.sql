-- Persona Engine v3 - "Living Personalities"
-- supabase/migrations/20251211_persona_engine_v3.sql

-- 1.1 Persona User State (per-user, per-persona memory)
CREATE TABLE IF NOT EXISTS persona_user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  coach_id text, -- optional, for coach-specific variants
  usage_count int DEFAULT 0,
  last_used_at timestamptz,
  avg_energy_delta int DEFAULT 0,      -- how much user tends to prefer above/below base
  avg_warmth_delta int DEFAULT 0,
  avg_directiveness_delta int DEFAULT 0,
  preferred_pacing text,               -- fast|normal|slow|null
  preferred_sentence_length text,      -- short|medium|long|null
  preferred_stage text,                -- base|apprentice|mastery|legend|null
  rejection_count int DEFAULT 0,
  approval_count int DEFAULT 0,
  notes jsonb DEFAULT '{}'::jsonb,     -- arbitrary learned traits, tags
  personality_bias jsonb DEFAULT '{}'::jsonb, -- merged tuning deltas
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS persona_user_state_unique
  ON persona_user_state(user_id, persona_id, coalesce(coach_id, 'global'));

CREATE INDEX IF NOT EXISTS persona_user_state_user_idx
  ON persona_user_state(user_id, persona_id);

-- 1.2 Persona Interaction Log
CREATE TABLE IF NOT EXISTS persona_interaction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  coach_id text,
  session_id text,           -- optional conversation/session grouping
  emotion_state text,        -- from Emotion OS at time of interaction
  motion_profile_used text,  -- id/key of motion contour
  stage_used text,           -- base|apprentice|mastery|legend
  outcome_tag text,          -- success|fail|neutral|crisis|breakthrough
  explicit_feedback text,    -- like|dislike|null
  implicit_signals jsonb,    -- ex: { "length": "too_long", "user_interrupt": true }
  tuning_applied jsonb,      -- final tuning deltas
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persona_interaction_log_user_idx
  ON persona_interaction_log(user_id, persona_id, created_at DESC);

CREATE INDEX IF NOT EXISTS persona_interaction_log_session_idx
  ON persona_interaction_log(session_id) WHERE session_id IS NOT NULL;

-- 1.3 Persona Motion Profiles
CREATE TABLE IF NOT EXISTS persona_motion_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,     -- "gentle_arc", "hype_wave", etc.
  name text NOT NULL,
  description text,
  phases jsonb NOT NULL,        -- list of segments with tuning deltas
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persona_motion_profiles_key_idx
  ON persona_motion_profiles(key);

-- 1.4 Persona DNA
CREATE TABLE IF NOT EXISTS persona_dna (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  dna jsonb NOT NULL,           -- encoded gene set
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS persona_dna_unique
  ON persona_dna(persona_id, version);

CREATE INDEX IF NOT EXISTS persona_dna_persona_idx
  ON persona_dna(persona_id, version DESC);




