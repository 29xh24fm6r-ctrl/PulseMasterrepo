CREATE TABLE IF NOT EXISTS trajectory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  day DATE NOT NULL,
  horizon_days INTEGER NOT NULL,
  headline TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  drivers TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, day, horizon_days)
);

CREATE INDEX IF NOT EXISTS trajectory_snapshots_owner_day
  ON trajectory_snapshots(owner_user_id, day);

-- RLS Policies
ALTER TABLE trajectory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own trajectory snapshots"
  ON trajectory_snapshots FOR SELECT
  USING (auth.uid()::text = owner_user_id);

CREATE POLICY "Users can insert their own trajectory snapshots"
  ON trajectory_snapshots FOR INSERT
  WITH CHECK (auth.uid()::text = owner_user_id);
