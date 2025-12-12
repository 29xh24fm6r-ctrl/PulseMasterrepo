-- Experience v9: Parallel Life Simulator
-- supabase/migrations/20251211_experience_v9_life_simulator.sql

CREATE TABLE IF NOT EXISTS life_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  hypothesis TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  result JSONB NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_life_simulations_user_id ON life_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_life_simulations_generated_at ON life_simulations(generated_at DESC);

-- RLS Policies
ALTER TABLE life_simulations ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own simulations
CREATE POLICY "Users can view their own simulations" ON life_simulations
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own simulations" ON life_simulations
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);



