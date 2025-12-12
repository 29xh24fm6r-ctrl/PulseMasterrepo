-- Sovereign Intelligence Mode: Behavior Profiles Table
-- supabase/migrations/sovereign_behavior_profiles.sql

CREATE TABLE IF NOT EXISTS sovereign_behavior_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Style knobs
  push_intensity TEXT NOT NULL DEFAULT 'balanced' CHECK (push_intensity IN ('gentle', 'balanced', 'assertive')),
  autonomy_level TEXT NOT NULL DEFAULT 'medium' CHECK (autonomy_level IN ('low', 'medium', 'high')),
  guidance_style TEXT NOT NULL DEFAULT 'advisory' CHECK (guidance_style IN ('coaching', 'advisory', 'directive', 'reflective')),
  planning_granularity TEXT NOT NULL DEFAULT 'balanced' CHECK (planning_granularity IN ('coarse', 'balanced', 'fine')),
  
  -- Learned weights (JSONB)
  domain_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_tolerance NUMERIC NOT NULL DEFAULT 0.5 CHECK (risk_tolerance >= 0 AND risk_tolerance <= 1),
  change_speed NUMERIC NOT NULL DEFAULT 0.5 CHECK (change_speed >= 0 AND change_speed <= 1),
  
  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  last_update_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_sovereign_behavior_profiles_user_id ON sovereign_behavior_profiles(user_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_sovereign_behavior_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sovereign_behavior_profiles_updated_at
  BEFORE UPDATE ON sovereign_behavior_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_sovereign_behavior_profiles_updated_at();



