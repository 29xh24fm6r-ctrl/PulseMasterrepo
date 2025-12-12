-- Meta-Learning Layer: Intervention Outcomes Table
-- supabase/migrations/intervention_outcomes.sql

CREATE TABLE IF NOT EXISTS intervention_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Intervention details
  intervention_type TEXT NOT NULL,
  domain TEXT NOT NULL,
  context_snapshot JSONB,
  
  -- Outcome metrics
  acted_on BOOLEAN DEFAULT FALSE,
  time_to_action_minutes INTEGER,
  xp_delta INTEGER,
  mood_delta NUMERIC,
  streak_impact INTEGER,
  
  -- User feedback
  user_feedback TEXT CHECK (user_feedback IN ('positive', 'neutral', 'negative')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervention_outcomes_user_id ON intervention_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_intervention_outcomes_timestamp ON intervention_outcomes(timestamp);
CREATE INDEX IF NOT EXISTS idx_intervention_outcomes_type ON intervention_outcomes(intervention_type);
CREATE INDEX IF NOT EXISTS idx_intervention_outcomes_domain ON intervention_outcomes(domain);



