-- Coach Voice Persona Engine v1
-- supabase/migrations/20251211_coach_voice_persona_v1.sql

-- Voice Profiles (archetypes)
CREATE TABLE IF NOT EXISTS voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,  -- 'hype_warrior', 'zen_therapist', etc.
  name text NOT NULL,
  description text,
  style jsonb NOT NULL,  -- tone config
  default_speed int DEFAULT 1,  -- 0-2 (slow, normal, fast)
  default_energy int DEFAULT 50,  -- 0-100
  default_intensity int DEFAULT 50,  -- 0-100
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_profiles_key_idx
ON voice_profiles (key);

-- Coach Voice Overrides (per-coach defaults)
CREATE TABLE IF NOT EXISTS coach_voice_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id text NOT NULL,  -- 'sales', 'confidant', 'career', etc.
  voice_profile_id uuid REFERENCES voice_profiles(id) ON DELETE CASCADE,
  emotion_overrides jsonb,  -- mapping of emotional states → voice profiles
  created_at timestamptz DEFAULT now(),
  UNIQUE (coach_id)
);

CREATE INDEX IF NOT EXISTS coach_voice_overrides_coach_idx
ON coach_voice_overrides (coach_id);

-- Extend user_voice_settings to add preferred_coach_voice
ALTER TABLE user_voice_settings
ADD COLUMN IF NOT EXISTS preferred_coach_voice jsonb DEFAULT '{}';

-- This will map coach_id → voice_profile_id or "auto"
-- Example: { "sales": "uuid", "confidant": "auto", "career": "uuid" }




