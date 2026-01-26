-- ============================================
-- OMEGA RUNS TABLE
-- Workflow-level envelope for Temporal workflows
-- Provides operational visibility into Omega processing
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_omega_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id UUID NOT NULL UNIQUE,  -- Links to reasoning traces, idempotency key

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,

  -- Workflow state
  workflow_id TEXT,  -- Temporal workflow ID
  run_id TEXT,  -- Temporal run ID
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),

  -- Results summary
  approved BOOLEAN,
  auto_executed BOOLEAN,
  intent JSONB,
  draft JSONB,
  guardian_review JSONB,
  errors JSONB DEFAULT '[]',

  -- Metrics
  reasoning_steps INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_omega_runs_user ON pulse_omega_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_omega_runs_session ON pulse_omega_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_omega_runs_status ON pulse_omega_runs(status);
CREATE INDEX IF NOT EXISTS idx_omega_runs_workflow ON pulse_omega_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_omega_runs_created ON pulse_omega_runs(created_at DESC);

-- RLS
ALTER TABLE pulse_omega_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own omega runs"
  ON pulse_omega_runs FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access to omega runs"
  ON pulse_omega_runs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- NOTIFICATIONS TABLE (if not exists)
-- For queued draft notifications
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON pulse_notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON pulse_notifications(created_at DESC);

ALTER TABLE pulse_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON pulse_notifications FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own notifications"
  ON pulse_notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access to notifications"
  ON pulse_notifications FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- OMEGA RUNS VIEW
-- Aggregate view for dashboard
-- ============================================

CREATE OR REPLACE VIEW pulse_omega_runs_summary AS
SELECT
  user_id,
  DATE(created_at) AS run_date,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE approved = TRUE) AS approved_runs,
  COUNT(*) FILTER (WHERE auto_executed = TRUE) AS auto_executed_runs,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_runs,
  AVG(total_duration_ms) AS avg_duration_ms,
  AVG(reasoning_steps) AS avg_reasoning_steps
FROM pulse_omega_runs
GROUP BY user_id, DATE(created_at);
