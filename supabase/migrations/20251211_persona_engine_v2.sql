-- Persona Engine v2 - "Voices of Infinity"
-- supabase/migrations/20251211_persona_engine_v2.sql

-- Extend voice_profiles
ALTER TABLE voice_profiles
ADD COLUMN IF NOT EXISTS stage_configs jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_generated boolean DEFAULT false;

-- Persona Fusions
CREATE TABLE IF NOT EXISTS persona_fusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  persona_a uuid REFERENCES voice_profiles(id) ON DELETE CASCADE,
  persona_b uuid REFERENCES voice_profiles(id) ON DELETE CASCADE,
  weight_a int NOT NULL DEFAULT 50 CHECK (weight_a >= 0 AND weight_a <= 100),
  weight_b int NOT NULL DEFAULT 50 CHECK (weight_b >= 0 AND weight_b <= 100),
  style jsonb NOT NULL,  -- precomputed fusion matrix
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persona_fusions_persona_a_idx
ON persona_fusions (persona_a);

CREATE INDEX IF NOT EXISTS persona_fusions_persona_b_idx
ON persona_fusions (persona_b);

-- Persona Generation Requests
CREATE TABLE IF NOT EXISTS persona_generation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_description text NOT NULL,
  generated_profile_id uuid REFERENCES voice_profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persona_generation_requests_user_idx
ON persona_generation_requests (user_id, created_at DESC);

-- Persona Context Rules
CREATE TABLE IF NOT EXISTS persona_context_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL,  -- 'emotion' | 'time' | 'kpi' | 'mission' | 'calendar' | 'stress'
  trigger_value text NOT NULL,  -- e.g. 'stressed', 'morning', 'mission_elite', etc.
  coach_id text,
  persona_id uuid REFERENCES voice_profiles(id) ON DELETE CASCADE,
  priority int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persona_context_rules_trigger_idx
ON persona_context_rules (trigger_type, trigger_value);

CREATE INDEX IF NOT EXISTS persona_context_rules_coach_idx
ON persona_context_rules (coach_id);

-- Roleplay Masks
CREATE TABLE IF NOT EXISTS roleplay_masks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  style jsonb NOT NULL,
  difficulty int DEFAULT 5 CHECK (difficulty >= 1 AND difficulty <= 10),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roleplay_masks_difficulty_idx
ON roleplay_masks (difficulty);




