-- Experience v10: Collective Intelligence Mesh
-- supabase/migrations/20251211_experience_v10_mesh.sql

CREATE TABLE IF NOT EXISTS collective_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  extracted_from INTEGER NOT NULL, -- number of users contributing (anonymized)
  strengths JSONB,
  risks JSONB,
  recommended_protocols JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_collective_alignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_code TEXT NOT NULL,
  fit_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collective_patterns_code ON collective_patterns(pattern_code);
CREATE INDEX IF NOT EXISTS idx_user_collective_alignment_user_id ON user_collective_alignment(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collective_alignment_pattern_code ON user_collective_alignment(pattern_code);

-- RLS Policies
ALTER TABLE collective_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collective_alignment ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can view collective patterns (public aggregated data)
CREATE POLICY "Everyone can view collective patterns" ON collective_patterns
  FOR SELECT
  USING (true);

-- RLS: Users can only see their own alignment
CREATE POLICY "Users can view their own collective alignment" ON user_collective_alignment
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own collective alignment" ON user_collective_alignment
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);



