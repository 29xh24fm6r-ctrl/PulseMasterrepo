-- Experience v6: The AI Twin
-- supabase/migrations/20251210_experience_v6_ai_twin.sql

CREATE TABLE IF NOT EXISTS ai_twin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb, -- compressed self model
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  values JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS ai_twin_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  model_version TEXT NOT NULL DEFAULT 'v1',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS ai_twin_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_type TEXT NOT NULL, -- 'procrastination','overwhelm','late_night_scroll'
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL,
  outcome TEXT, -- 'accepted','ignored','snoozed'
  outcome_details JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_twin_profiles_user_id ON ai_twin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_twin_snapshots_user_id ON ai_twin_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_twin_interventions_user_id ON ai_twin_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_twin_interventions_created_at ON ai_twin_interventions(created_at DESC);

-- RLS Policies
ALTER TABLE ai_twin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_twin_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_twin_interventions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own twin data
CREATE POLICY "Users can view their own twin profile" ON ai_twin_profiles
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own twin profile" ON ai_twin_profiles
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own twin profile" ON ai_twin_profiles
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own twin snapshots" ON ai_twin_snapshots
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own twin snapshots" ON ai_twin_snapshots
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own twin interventions" ON ai_twin_interventions
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own twin interventions" ON ai_twin_interventions
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own twin interventions" ON ai_twin_interventions
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Update trigger
CREATE OR REPLACE FUNCTION update_ai_twin_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_twin_profiles_updated_at
  BEFORE UPDATE ON ai_twin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_twin_profiles_updated_at();



