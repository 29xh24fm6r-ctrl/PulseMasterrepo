-- ============================================
-- CONFIDENCE LEDGER
-- Tracks predicted confidence vs actual outcomes
-- Enables confidence calibration over time
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_confidence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- What made the prediction
  session_id UUID,
  node TEXT NOT NULL,  -- 'intent_predictor', 'draft_generator', 'guardian', etc.

  -- The prediction
  prediction_type TEXT NOT NULL,  -- 'intent', 'draft', 'simulation', 'improvement'
  prediction_id UUID,  -- Reference to the actual prediction (intent_id, draft_id, etc.)
  predicted_confidence FLOAT NOT NULL CHECK (predicted_confidence >= 0 AND predicted_confidence <= 1),

  -- Context at prediction time
  context_snapshot JSONB DEFAULT '{}',  -- Relevant context when prediction was made

  -- The outcome (filled in later)
  outcome TEXT,  -- 'success', 'partial', 'failure', 'modified', 'rejected', 'timeout'
  outcome_confidence FLOAT,  -- What confidence SHOULD have been (hindsight)
  outcome_notes TEXT,
  outcome_recorded_at TIMESTAMPTZ,

  -- Calibration metrics (computed)
  confidence_error FLOAT,  -- predicted - actual (positive = overconfident)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for calibration queries
CREATE INDEX IF NOT EXISTS idx_confidence_user_node ON pulse_confidence_events(user_id, node);
CREATE INDEX IF NOT EXISTS idx_confidence_user_type ON pulse_confidence_events(user_id, prediction_type);
CREATE INDEX IF NOT EXISTS idx_confidence_outcome ON pulse_confidence_events(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_confidence_calibration ON pulse_confidence_events(user_id, predicted_confidence, outcome);

-- RLS
ALTER TABLE pulse_confidence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own confidence events"
  ON pulse_confidence_events FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access to confidence events"
  ON pulse_confidence_events FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- CONFIDENCE CALIBRATION VIEW
-- Aggregates calibration data for analysis
-- ============================================

CREATE OR REPLACE VIEW pulse_confidence_calibration AS
SELECT
  user_id,
  node,
  prediction_type,

  -- Bucket confidence into ranges
  CASE
    WHEN predicted_confidence < 0.5 THEN 'low'
    WHEN predicted_confidence < 0.7 THEN 'medium'
    WHEN predicted_confidence < 0.85 THEN 'high'
    ELSE 'very_high'
  END AS confidence_bucket,

  -- Count outcomes
  COUNT(*) AS total_predictions,
  COUNT(*) FILTER (WHERE outcome = 'success') AS successes,
  COUNT(*) FILTER (WHERE outcome = 'partial') AS partials,
  COUNT(*) FILTER (WHERE outcome = 'failure') AS failures,
  COUNT(*) FILTER (WHERE outcome = 'modified') AS modified,
  COUNT(*) FILTER (WHERE outcome = 'rejected') AS rejected,

  -- Calibration metrics
  AVG(predicted_confidence) AS avg_predicted,
  AVG(CASE WHEN outcome = 'success' THEN 1.0 WHEN outcome = 'partial' THEN 0.5 ELSE 0.0 END) AS actual_success_rate,
  AVG(confidence_error) AS avg_calibration_error,

  -- Is the system well-calibrated?
  ABS(AVG(predicted_confidence) - AVG(CASE WHEN outcome = 'success' THEN 1.0 WHEN outcome = 'partial' THEN 0.5 ELSE 0.0 END)) AS calibration_gap

FROM pulse_confidence_events
WHERE outcome IS NOT NULL
GROUP BY user_id, node, prediction_type, confidence_bucket;
