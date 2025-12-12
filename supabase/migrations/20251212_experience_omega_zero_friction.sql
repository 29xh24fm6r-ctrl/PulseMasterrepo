-- Experience Ω: Zero-Friction User Enablement Engine
-- supabase/migrations/20251212_experience_omega_zero_friction.sql

-- Cognitive Profile
CREATE TABLE IF NOT EXISTS cognitive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  modality_bias TEXT NOT NULL DEFAULT 'mixed', -- 'voice' | 'visual' | 'minimal' | 'mixed'
  information_density TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  execution_style TEXT NOT NULL DEFAULT 'structured', -- 'structured' | 'flow' | 'exploratory' | 'avoidance-prone'
  interaction_speed TEXT NOT NULL DEFAULT 'normal', -- 'slow' | 'normal' | 'fast'
  emotional_sensitivity TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  decision_mode TEXT NOT NULL DEFAULT 'hybrid', -- 'logic' | 'emotion' | 'hybrid'
  confidence_score NUMERIC DEFAULT 0.5, -- 0-1, how confident we are in this profile
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Interaction Events (for learning)
CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'click', 'voice', 'task_complete', 'screen_switch', 'hesitation', 'back_navigation'
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Moment-Driven Onboarding Registry
CREATE TABLE IF NOT EXISTS mdo_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  micro_explainer TEXT NOT NULL,
  target_experience TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MDO Delivery Log
CREATE TABLE IF NOT EXISTS mdo_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trigger_code TEXT NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false
);

-- Intent Recognition Log
CREATE TABLE IF NOT EXISTS intent_recognition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  detected_intent TEXT NOT NULL,
  confidence NUMERIC,
  routed_to TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Progressive Autonomy State
CREATE TABLE IF NOT EXISTS autonomy_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 0, -- 0-4
  last_level_change TIMESTAMPTZ,
  level_change_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Guardian Mode State
CREATE TABLE IF NOT EXISTS guardian_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ,
  activation_reason TEXT,
  simplified_interface_enabled BOOLEAN DEFAULT false,
  notifications_paused BOOLEAN DEFAULT false,
  coach_tone_override TEXT, -- 'gentle', 'supportive', etc.
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cognitive_profiles_user_id ON cognitive_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_user_id ON interaction_events(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_timestamp ON interaction_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mdo_deliveries_user_id ON mdo_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_recognition_log_user_id ON intent_recognition_log(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomy_state_user_id ON autonomy_state(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_state_user_id ON guardian_state(user_id);

-- RLS Policies
ALTER TABLE cognitive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdo_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdo_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_recognition_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomy_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_state ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own data
CREATE POLICY "Users can view their own cognitive profile" ON cognitive_profiles
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own cognitive profile" ON cognitive_profiles
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own cognitive profile" ON cognitive_profiles
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own interaction events" ON interaction_events
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own interaction events" ON interaction_events
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Everyone can view MDO triggers (public reference data)
CREATE POLICY "Everyone can view MDO triggers" ON mdo_triggers
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own MDO deliveries" ON mdo_deliveries
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own MDO deliveries" ON mdo_deliveries
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own intent recognition log" ON intent_recognition_log
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own intent recognition log" ON intent_recognition_log
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own autonomy state" ON autonomy_state
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own autonomy state" ON autonomy_state
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own autonomy state" ON autonomy_state
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view their own guardian state" ON guardian_state
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own guardian state" ON guardian_state
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own guardian state" ON guardian_state
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Update triggers
CREATE OR REPLACE FUNCTION update_cognitive_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cognitive_profiles_updated_at
  BEFORE UPDATE ON cognitive_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_cognitive_profiles_updated_at();

CREATE OR REPLACE FUNCTION update_autonomy_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_autonomy_state_updated_at
  BEFORE UPDATE ON autonomy_state
  FOR EACH ROW
  EXECUTE FUNCTION update_autonomy_state_updated_at();

CREATE OR REPLACE FUNCTION update_guardian_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guardian_state_updated_at
  BEFORE UPDATE ON guardian_state
  FOR EACH ROW
  EXECUTE FUNCTION update_guardian_state_updated_at();

-- Seed MDO Triggers
INSERT INTO mdo_triggers (trigger_code, description, micro_explainer, target_experience)
VALUES
  ('second_task_added', 'User adds second task', 'Want Pulse to schedule your day for you?', '/autopilot'),
  ('first_emotion_log', 'User writes first emotional journal', 'Pulse can track your emotional patterns. Want to enable Emotion OS?', '/emotion'),
  ('task_stall', 'User stalls on task', 'Want Pulse to help you break this down?', '/coaches'),
  ('first_relationship', 'User adds first relationship', 'Pulse can help you maintain connections. Want to enable Relationship Engine?', '/relationships'),
  ('high_stress', 'User shows high stress', 'Want Pulse to help you manage this?', '/guardian'),
  ('first_voice', 'User uses voice for first time', 'Voice mode is powerful. Want to try voice-only mode?', '/voice-os')
ON CONFLICT (trigger_code) DO NOTHING;



