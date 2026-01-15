CREATE TABLE IF NOT EXISTS orientation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  day DATE NOT NULL,
  feedback TEXT NOT NULL CHECK (feedback IN ('accurate','off')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, day)
);

CREATE INDEX IF NOT EXISTS orientation_feedback_owner_day
  ON orientation_feedback(owner_user_id, day);

-- RLS Policies
ALTER TABLE orientation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own orientation feedback"
  ON orientation_feedback FOR SELECT
  USING (auth.uid()::text = owner_user_id);

CREATE POLICY "Users can insert their own orientation feedback"
  ON orientation_feedback FOR INSERT
  WITH CHECK (auth.uid()::text = owner_user_id);
