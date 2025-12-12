-- Experience v11: Conscious Companion Layer
-- supabase/migrations/20251211_experience_v11_companion.sql

CREATE TABLE IF NOT EXISTS companion_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  last_seen_situation TEXT,
  last_intervention_id UUID,
  personality_mode TEXT DEFAULT 'default', -- 'supportive','tough-love','mentor'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS companion_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  situation TEXT NOT NULL,
  insight TEXT,
  suggestion TEXT,
  emotional_grounding TEXT,
  timeline_protection TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companion_state_user_id ON companion_state(user_id);
CREATE INDEX IF NOT EXISTS idx_companion_interventions_user_id ON companion_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_companion_interventions_created_at ON companion_interventions(created_at DESC);

-- RLS Policies
ALTER TABLE companion_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_interventions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own companion data
CREATE POLICY "Users can view their own companion state" ON companion_state
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own companion state" ON companion_state
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own companion state" ON companion_state
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own companion interventions" ON companion_interventions
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own companion interventions" ON companion_interventions
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Update trigger
CREATE OR REPLACE FUNCTION update_companion_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companion_state_updated_at
  BEFORE UPDATE ON companion_state
  FOR EACH ROW
  EXECUTE FUNCTION update_companion_state_updated_at();



