CREATE TABLE IF NOT EXISTS finance_daily_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  day DATE NOT NULL,
  income NUMERIC NOT NULL DEFAULT 0,
  spend NUMERIC NOT NULL DEFAULT 0,
  essentials_spend NUMERIC NOT NULL DEFAULT 0,
  discretionary_spend NUMERIC NOT NULL DEFAULT 0,
  cash_on_hand NUMERIC,
  anomaly_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, day)
);

CREATE INDEX IF NOT EXISTS finance_daily_rollups_owner_day
  ON finance_daily_rollups(owner_user_id, day);

-- RLS Policies
ALTER TABLE finance_daily_rollups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own finance rollups"
  ON finance_daily_rollups FOR SELECT
  USING (auth.uid()::text = owner_user_id);

-- Only service role (server-side) should typically write to this table to ensure data integrity,
-- but allowing user write if they are the owner for now is consistent with other patterns unless strict service-role only is enforced.
-- Given the "Server-Only" nature of aggregation, we might restrict this further in the future.
CREATE POLICY "Users can insert their own finance rollups"
  ON finance_daily_rollups FOR INSERT
  WITH CHECK (auth.uid()::text = owner_user_id);
