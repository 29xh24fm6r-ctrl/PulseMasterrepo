-- Safety & Boundary Engine v1
-- supabase/migrations/20251211_safety_engine_v1.sql

-- 1.1 Safety Policies
CREATE TABLE IF NOT EXISTS safety_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,          -- "global_default", "coach_confidant", etc.
  name text NOT NULL,
  description text,
  policy_json jsonb NOT NULL,        -- structured rules
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS safety_policies_key_idx
  ON safety_policies(key) WHERE is_active = true;

-- 1.2 Safety Incidents
CREATE TABLE IF NOT EXISTS safety_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  coach_id text,
  persona_id uuid REFERENCES voice_profiles(id) ON DELETE SET NULL,
  policy_key text,
  incident_type text,                -- "blocked_output", "sanitized_output", "escalation"
  category text,                     -- "sexual", "self_harm", "violence", etc.
  severity int,                      -- 1–5
  user_input_excerpt text,
  model_output_excerpt text,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS safety_incidents_user_idx
  ON safety_incidents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS safety_incidents_category_idx
  ON safety_incidents(category, severity);

-- 1.3 User Safety Settings
CREATE TABLE IF NOT EXISTS user_safety_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_mature_but_nonsexual boolean DEFAULT false,
  allow_direct_language boolean DEFAULT true,
  tone_sensitivity text DEFAULT 'normal',  -- 'low' | 'normal' | 'high'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS user_safety_settings_user_idx
  ON user_safety_settings(user_id);




