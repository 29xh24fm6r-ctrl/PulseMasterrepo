-- Experience v12: Pulse Singularity Mode (Meta-OS)
-- supabase/migrations/20251211_experience_v12_metaos.sql

CREATE TABLE IF NOT EXISTS meta_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preferred_os_styles JSONB,   -- 'structured', 'flow-based', 'minimalist', etc.
  preferred_coach_modes JSONB,
  preferred_experience_modes JSONB, -- voice-first, AR-first, dashboard-first
  auto_adjustments_enabled BOOLEAN DEFAULT true,
  last_rebuild_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS meta_rebuilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rebuild_type TEXT NOT NULL, -- 'full','partial','theme','workflow'
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meta_profiles_user_id ON meta_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_rebuilds_user_id ON meta_rebuilds(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_rebuilds_created_at ON meta_rebuilds(created_at DESC);

-- RLS Policies
ALTER TABLE meta_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_rebuilds ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own meta data
CREATE POLICY "Users can view their own meta profile" ON meta_profiles
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own meta profile" ON meta_profiles
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own meta profile" ON meta_profiles
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own meta rebuilds" ON meta_rebuilds
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own meta rebuilds" ON meta_rebuilds
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Update trigger
CREATE OR REPLACE FUNCTION update_meta_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meta_profiles_updated_at
  BEFORE UPDATE ON meta_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_meta_profiles_updated_at();



