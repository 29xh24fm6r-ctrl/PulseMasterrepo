-- Experience v8: World-Scale Mind
-- supabase/migrations/20251211_experience_v8_world_mind.sql

CREATE TABLE IF NOT EXISTS world_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL, -- 'economic','seasonal','cultural','behavioral'
  name TEXT NOT NULL,
  description TEXT,
  magnitude NUMERIC,
  trend TEXT, -- 'rising','falling','stable'
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  typical_impacts JSONB NOT NULL,
  recommended_adjustments JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_world_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_code TEXT NOT NULL,
  impact_strength NUMERIC,
  recommended_actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_world_signals_type ON world_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_world_signals_timestamp ON world_signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_world_patterns_code ON world_patterns(pattern_code);
CREATE INDEX IF NOT EXISTS idx_user_world_adjustments_user_id ON user_world_adjustments(user_id);

-- RLS Policies
ALTER TABLE world_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_world_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can view world signals (public data)
CREATE POLICY "Everyone can view world signals" ON world_signals
  FOR SELECT
  USING (true);

-- RLS: Everyone can view world patterns (public data)
CREATE POLICY "Everyone can view world patterns" ON world_patterns
  FOR SELECT
  USING (true);

-- RLS: Users can only see their own adjustments
CREATE POLICY "Users can view their own world adjustments" ON user_world_adjustments
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own world adjustments" ON user_world_adjustments
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);



