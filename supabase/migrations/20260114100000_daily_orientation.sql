CREATE TABLE IF NOT EXISTS daily_orientation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  day DATE NOT NULL,
  dominant_state TEXT NOT NULL,
  primary_reason TEXT NOT NULL,
  secondary_factors TEXT[],
  confidence NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, day)
);

CREATE INDEX IF NOT EXISTS daily_orientation_snapshots_owner_day 
  ON daily_orientation_snapshots(owner_user_id, day);

-- RLS Policies
ALTER TABLE daily_orientation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own daily orientations"
  ON daily_orientation_snapshots FOR SELECT
  USING (auth.uid()::text = owner_user_id);

CREATE POLICY "Users can insert their own daily orientations"
  ON daily_orientation_snapshots FOR INSERT
  WITH CHECK (auth.uid()::text = owner_user_id);
