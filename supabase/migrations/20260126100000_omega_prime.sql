-- ============================================
-- PULSE OMEGA PRIME - Complete Schema
-- ============================================
-- Stage 1: ASI-O (Operational Superintelligence)
-- Stage 2: ASI-E (Evolving Superintelligence)
-- Stage 3: OMEGA (Recursive Self-Improvement)
-- Stage 4: OMEGA PRIME (Life-Scale Intelligence)
-- ============================================

-- ============================================
-- STAGE 1: ASI-O (Operational Superintelligence)
-- ============================================

-- Incoming signals from all sources
CREATE TABLE IF NOT EXISTS pulse_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source TEXT NOT NULL, -- 'calendar', 'email', 'crm', 'finance', 'task', 'manual'
  signal_type TEXT NOT NULL, -- 'event_created', 'deadline_approaching', 'deal_stalled', 'message_received'
  payload JSONB NOT NULL, -- raw signal data
  metadata JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_user_unprocessed ON pulse_signals(user_id, processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_signals_created ON pulse_signals(created_at DESC);

-- Predicted intents from signals
CREATE TABLE IF NOT EXISTS pulse_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  signal_id UUID REFERENCES pulse_signals(id) ON DELETE SET NULL,
  predicted_need TEXT NOT NULL, -- what user probably wants
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT, -- why we predicted this
  suggested_action TEXT NOT NULL, -- what to draft
  draft_type TEXT, -- 'meeting_prep', 'email', 'report', 'action_plan', 'summary', 'task'
  urgency TEXT DEFAULT 'when_convenient', -- 'immediate', 'soon', 'when_convenient'
  status TEXT DEFAULT 'pending', -- 'pending', 'acted', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intents_user_pending ON pulse_intents(user_id, status) WHERE status = 'pending';

-- Proactively generated drafts
CREATE TABLE IF NOT EXISTS pulse_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  intent_id UUID REFERENCES pulse_intents(id) ON DELETE SET NULL,
  draft_type TEXT NOT NULL, -- 'meeting_prep', 'email', 'report', 'action_plan', 'summary'
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- structured draft content
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT DEFAULT 'pending_review', -- 'pending_review', 'approved', 'rejected', 'auto_executed', 'edited'
  user_feedback TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_user_pending ON pulse_drafts(user_id, status) WHERE status = 'pending_review';

-- ============================================
-- STAGE 2: ASI-E (Evolving Superintelligence)
-- ============================================

-- Track outcomes after draft execution
CREATE TABLE IF NOT EXISTS pulse_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  draft_id UUID REFERENCES pulse_drafts(id) ON DELETE SET NULL,
  outcome_type TEXT NOT NULL, -- 'success', 'partial', 'failure', 'unknown'
  outcome_signal JSONB, -- what happened after
  user_rating INTEGER CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
  user_notes TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_user ON pulse_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_draft ON pulse_outcomes(draft_id);

-- Learned strategies that work
CREATE TABLE IF NOT EXISTS pulse_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  strategy_type TEXT NOT NULL, -- 'signal_pattern', 'draft_template', 'timing', 'tone'
  pattern JSONB NOT NULL, -- the pattern that works
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  active BOOLEAN DEFAULT TRUE,
  learned_from UUID[], -- outcome_ids that taught this
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategies_user_active ON pulse_strategies(user_id, active) WHERE active = TRUE;

-- User preferences learned over time
CREATE TABLE IF NOT EXISTS pulse_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  preference_type TEXT NOT NULL, -- 'communication_style', 'review_threshold', 'auto_execute_domains', 'timing'
  preference_value JSONB NOT NULL,
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_type)
);

-- ============================================
-- STAGE 3: OMEGA (Recursive Self-Improvement)
-- ============================================

-- Observer: reasoning traces
CREATE TABLE IF NOT EXISTS pulse_reasoning_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id UUID, -- groups related reasoning
  trace_type TEXT NOT NULL, -- 'intent_prediction', 'draft_generation', 'strategy_selection', 'simulation'
  input_context JSONB NOT NULL,
  reasoning_steps JSONB NOT NULL, -- array of steps taken
  output JSONB NOT NULL,
  duration_ms INTEGER,
  success BOOLEAN,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traces_user_session ON pulse_reasoning_traces(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_traces_created ON pulse_reasoning_traces(created_at DESC);

-- Diagnoser: identified cognitive limits
CREATE TABLE IF NOT EXISTS pulse_cognitive_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  limit_type TEXT NOT NULL, -- 'prediction_blind_spot', 'domain_weakness', 'timing_error', 'confidence_miscalibration'
  description TEXT NOT NULL,
  evidence JSONB NOT NULL, -- trace_ids and patterns that revealed this
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  addressed BOOLEAN DEFAULT FALSE,
  improvement_id UUID, -- links to improvement that fixed it
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cognitive_limits_user ON pulse_cognitive_limits(user_id, addressed);

-- Simulator: hypothetical scenarios tested
CREATE TABLE IF NOT EXISTS pulse_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  simulation_type TEXT NOT NULL, -- 'strategy_test', 'counterfactual', 'future_projection'
  hypothesis TEXT NOT NULL,
  input_state JSONB NOT NULL,
  simulated_actions JSONB NOT NULL,
  predicted_outcomes JSONB NOT NULL,
  actual_outcome JSONB, -- filled in if we ran it
  accuracy_score FLOAT CHECK (accuracy_score IS NULL OR (accuracy_score >= 0 AND accuracy_score <= 1)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulations_user ON pulse_simulations(user_id);

-- Evolver: proposed improvements
CREATE TABLE IF NOT EXISTS pulse_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  improvement_type TEXT NOT NULL, -- 'prompt_adjustment', 'strategy_update', 'threshold_change', 'new_pattern'
  target_component TEXT NOT NULL, -- what's being improved
  current_state JSONB NOT NULL,
  proposed_change JSONB NOT NULL,
  expected_impact TEXT NOT NULL,
  simulation_id UUID REFERENCES pulse_simulations(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'testing', 'approved', 'rejected', 'rolled_back')),
  guardian_review JSONB, -- guardian's assessment
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_improvements_user_status ON pulse_improvements(user_id, status);

-- Guardian: immutable constraints
CREATE TABLE IF NOT EXISTS pulse_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_type TEXT NOT NULL, -- 'hard_limit', 'soft_limit', 'user_override'
  constraint_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  rule JSONB NOT NULL, -- the actual constraint logic
  immutable BOOLEAN DEFAULT FALSE, -- true = can never be changed
  violation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardian: constraint violations log
CREATE TABLE IF NOT EXISTS pulse_constraint_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  constraint_id UUID REFERENCES pulse_constraints(id) ON DELETE SET NULL,
  attempted_action JSONB NOT NULL,
  violation_reason TEXT NOT NULL,
  blocked BOOLEAN DEFAULT TRUE,
  override_requested BOOLEAN DEFAULT FALSE,
  override_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_user ON pulse_constraint_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_constraint ON pulse_constraint_violations(constraint_id);

-- ============================================
-- STAGE 4: OMEGA PRIME (Life-Scale Intelligence)
-- ============================================

-- Long-horizon goals
CREATE TABLE IF NOT EXISTS pulse_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  goal_type TEXT NOT NULL, -- 'career', 'financial', 'health', 'relationship', 'skill', 'legacy'
  title TEXT NOT NULL,
  description TEXT,
  target_state JSONB NOT NULL, -- what success looks like
  current_state JSONB, -- where we are now
  time_horizon TEXT, -- '30_days', '90_days', '1_year', '5_years', 'lifetime'
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  progress FLOAT DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'achieved', 'abandoned')),
  parent_goal_id UUID REFERENCES pulse_goals(id) ON DELETE SET NULL, -- for goal hierarchies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_active ON pulse_goals(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_goals_parent ON pulse_goals(parent_goal_id);

-- Life trajectory projections
CREATE TABLE IF NOT EXISTS pulse_trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  trajectory_type TEXT NOT NULL, -- 'current_path', 'optimized', 'alternative'
  time_horizon TEXT NOT NULL,
  starting_state JSONB NOT NULL,
  projected_milestones JSONB NOT NULL, -- array of {date, state, probability}
  projected_end_state JSONB NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  assumptions JSONB, -- what we assumed
  risks JSONB, -- identified risks
  opportunities JSONB, -- identified opportunities
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trajectories_user ON pulse_trajectories(user_id);

-- Life events and their impacts
CREATE TABLE IF NOT EXISTS pulse_life_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'milestone', 'setback', 'opportunity', 'decision', 'external'
  title TEXT NOT NULL,
  description TEXT,
  impact_assessment JSONB, -- how this affects trajectories
  affected_goals UUID[], -- goal_ids impacted
  significance TEXT DEFAULT 'medium' CHECK (significance IN ('low', 'medium', 'high', 'critical')),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_events_user ON pulse_life_events(user_id);
CREATE INDEX IF NOT EXISTS idx_life_events_occurred ON pulse_life_events(occurred_at DESC);

-- Cross-domain connections
CREATE TABLE IF NOT EXISTS pulse_domain_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain_a TEXT NOT NULL, -- 'health', 'finance', 'career', etc.
  domain_b TEXT NOT NULL,
  connection_type TEXT NOT NULL, -- 'causal', 'correlated', 'tradeoff', 'synergy'
  strength FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  description TEXT,
  evidence JSONB,
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_connections_user ON pulse_domain_connections(user_id);

-- ============================================
-- SEED GUARDIAN CONSTRAINTS
-- ============================================

INSERT INTO pulse_constraints (constraint_type, constraint_name, description, rule, immutable) VALUES
('hard_limit', 'no_financial_auto_execute', 'Never auto-execute financial transactions', '{"domains": ["finance"], "actions": ["transfer", "purchase", "sell"], "requires": "explicit_approval"}', TRUE),
('hard_limit', 'no_communication_impersonation', 'Never send communications pretending to be user without review', '{"actions": ["send_email", "send_message"], "requires": "user_review"}', TRUE),
('hard_limit', 'no_irreversible_without_confirmation', 'Never take irreversible actions without confirmation', '{"action_types": ["delete", "terminate", "cancel"], "requires": "explicit_approval"}', TRUE),
('hard_limit', 'confidence_floor', 'Never auto-execute below confidence threshold', '{"min_confidence": 0.85, "requires": "user_review_if_below"}', TRUE),
('soft_limit', 'daily_auto_action_cap', 'Limit autonomous actions per day', '{"max_daily_actions": 50, "action": "queue_for_review"}', FALSE),
('soft_limit', 'learning_rate_limit', 'Limit how fast strategies can change', '{"max_confidence_delta": 0.1, "per": "day"}', FALSE)
ON CONFLICT (constraint_name) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE pulse_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_reasoning_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_cognitive_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_constraint_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_domain_connections ENABLE ROW LEVEL SECURITY;

-- Service role bypass for all omega tables
CREATE POLICY "service_role_all_signals" ON pulse_signals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_intents" ON pulse_intents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_drafts" ON pulse_drafts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_outcomes" ON pulse_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_strategies" ON pulse_strategies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_preferences" ON pulse_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_traces" ON pulse_reasoning_traces FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_limits" ON pulse_cognitive_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_simulations" ON pulse_simulations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_improvements" ON pulse_improvements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_violations" ON pulse_constraint_violations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_goals" ON pulse_goals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_trajectories" ON pulse_trajectories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_events" ON pulse_life_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_connections" ON pulse_domain_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User ownership policies (required by Canon)
CREATE POLICY "pulse_user_owns_row" ON pulse_signals FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_intents FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_drafts FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_outcomes FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_strategies FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_preferences FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_reasoning_traces FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_cognitive_limits FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_simulations FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_improvements FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_constraint_violations FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_goals FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_trajectories FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_life_events FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);
CREATE POLICY "pulse_user_owns_row" ON pulse_domain_connections FOR ALL USING (current_user_sub() = user_id) WITH CHECK (current_user_sub() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment violation count on constraint
CREATE OR REPLACE FUNCTION increment_violation_count(p_constraint_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE pulse_constraints
  SET violation_count = violation_count + 1
  WHERE id = p_constraint_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
