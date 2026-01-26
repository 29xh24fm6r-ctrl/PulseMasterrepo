-- ============================================
-- HARDGUARD ESCALATION LEVELS
-- Adds granular autonomy tiers to constraints
-- ============================================

-- Add escalation level to constraints
ALTER TABLE pulse_constraints
ADD COLUMN IF NOT EXISTS escalation_level TEXT DEFAULT 'soft_block'
CHECK (escalation_level IN ('hard_block', 'soft_block', 'observe_only', 'full_auto'));

-- Add autonomy tier tracking
ALTER TABLE pulse_constraints
ADD COLUMN IF NOT EXISTS min_autonomy_level INTEGER DEFAULT 0
CHECK (min_autonomy_level >= 0 AND min_autonomy_level <= 3);

-- Add earned autonomy override
ALTER TABLE pulse_constraints
ADD COLUMN IF NOT EXISTS allows_earned_override BOOLEAN DEFAULT FALSE;

-- Update existing constraints with appropriate escalation levels
UPDATE pulse_constraints SET escalation_level = 'hard_block', min_autonomy_level = 3, allows_earned_override = FALSE
WHERE constraint_name = 'no_financial_auto_execute';

UPDATE pulse_constraints SET escalation_level = 'hard_block', min_autonomy_level = 3, allows_earned_override = FALSE
WHERE constraint_name = 'no_communication_impersonation';

UPDATE pulse_constraints SET escalation_level = 'hard_block', min_autonomy_level = 3, allows_earned_override = FALSE
WHERE constraint_name = 'no_irreversible_without_confirmation';

UPDATE pulse_constraints SET escalation_level = 'soft_block', min_autonomy_level = 2, allows_earned_override = TRUE
WHERE constraint_name = 'confidence_floor';

UPDATE pulse_constraints SET escalation_level = 'observe_only', min_autonomy_level = 1, allows_earned_override = TRUE
WHERE constraint_name = 'daily_auto_action_cap';

UPDATE pulse_constraints SET escalation_level = 'observe_only', min_autonomy_level = 0, allows_earned_override = TRUE
WHERE constraint_name = 'learning_rate_limit';

-- ============================================
-- USER AUTONOMY LEVELS
-- Tracks earned autonomy per user
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_user_autonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,

  -- Current autonomy level (0-3)
  current_level INTEGER DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 3),

  -- How it was determined
  level_reason TEXT,
  calibration_score FLOAT,
  total_predictions INTEGER DEFAULT 0,

  -- Level history
  level_history JSONB DEFAULT '[]',

  -- Overrides
  manual_override INTEGER,  -- If set, overrides computed level
  override_reason TEXT,
  override_expires_at TIMESTAMPTZ,

  -- Metadata
  last_evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE pulse_user_autonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own autonomy"
  ON pulse_user_autonomy FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access to autonomy"
  ON pulse_user_autonomy FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- AUTONOMY LEVEL DESCRIPTIONS
-- Reference table for level meanings
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_autonomy_levels (
  level INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  auto_execute_allowed BOOLEAN DEFAULT FALSE,
  requires_confirmation TEXT[] DEFAULT '{}',
  example_actions TEXT[]
);

INSERT INTO pulse_autonomy_levels (level, name, description, auto_execute_allowed, requires_confirmation, example_actions) VALUES
(0, 'Supervised', 'All actions require explicit confirmation', FALSE,
 ARRAY['all'],
 ARRAY['View suggestions only', 'Manual approval for everything']),

(1, 'Assisted', 'Low-risk actions can proceed, medium-risk needs confirmation', FALSE,
 ARRAY['medium_risk', 'high_risk'],
 ARRAY['Auto-create drafts', 'Queue for review', 'Basic scheduling']),

(2, 'Collaborative', 'Most actions proceed, only high-risk needs confirmation', TRUE,
 ARRAY['high_risk'],
 ARRAY['Send routine communications', 'Update tasks', 'Basic integrations']),

(3, 'Autonomous', 'Full autonomy within hard constraints', TRUE,
 ARRAY['hard_block_only'],
 ARRAY['Proactive outreach', 'Complex workflows', 'Cross-domain actions'])
ON CONFLICT (level) DO NOTHING;
