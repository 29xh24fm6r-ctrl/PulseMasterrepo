-- Experience v7: Pulse Societal Layer
-- supabase/migrations/20251210_experience_v7_societal.sql

CREATE TABLE IF NOT EXISTS cohort_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,         -- e.g. 'creator-sprinter', 'steady-builder'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  typical_patterns JSONB NOT NULL,   -- behaviors, habits, risk patterns
  strengths JSONB NOT NULL,
  risks JSONB NOT NULL,
  recommended_protocols JSONB NOT NULL, -- rituals, habits, safeguards
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_cohort_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  archetype_id UUID REFERENCES cohort_archetypes(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  confidence NUMERIC DEFAULT 0.7,
  UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cohort_archetypes_code ON cohort_archetypes(code);
CREATE INDEX IF NOT EXISTS idx_user_cohort_assignments_user_id ON user_cohort_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cohort_assignments_archetype_id ON user_cohort_assignments(archetype_id);

-- RLS Policies
ALTER TABLE cohort_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cohort_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can view archetypes (public reference data)
CREATE POLICY "Everyone can view archetypes" ON cohort_archetypes
  FOR SELECT
  USING (true);

-- RLS: Users can only see their own cohort assignment
CREATE POLICY "Users can view their own cohort assignment" ON user_cohort_assignments
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own cohort assignment" ON user_cohort_assignments
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own cohort assignment" ON user_cohort_assignments
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Seed archetypes
INSERT INTO cohort_archetypes (code, name, description, typical_patterns, strengths, risks, recommended_protocols)
VALUES
  (
    'creator-sprinter',
    'Creator Sprinter',
    'High-energy creators who work in intense bursts, then need recovery',
    '{"work_pattern": "intense_sprints", "recovery_needs": "high", "productivity_style": "burst"}',
    '["High creativity", "Rapid execution", "Innovation"]',
    '["Burnout risk", "Inconsistent output", "Overcommitment"]',
    '["Protect recovery time", "Schedule sprints with buffers", "Track energy cycles"]'
  ),
  (
    'steady-builder',
    'Steady Builder',
    'Consistent, methodical workers who build incrementally',
    '{"work_pattern": "steady_pace", "recovery_needs": "moderate", "productivity_style": "consistent"}',
    '["Reliability", "Long-term progress", "Sustainable pace"]',
    '["May miss opportunities", "Can plateau", "Risk of monotony"]',
    '["Maintain consistency", "Inject variety periodically", "Set stretch goals"]'
  ),
  (
    'relationship-hearted',
    'Relationship-Hearted',
    'People who thrive through connection and collaboration',
    '{"work_pattern": "collaborative", "recovery_needs": "social", "productivity_style": "team_focused"}',
    '["Strong networks", "Collaboration skills", "Emotional intelligence"]',
    '["May overcommit socially", "Difficulty saying no", "Neglect personal goals"]',
    '["Balance social and solo time", "Set boundaries", "Protect deep work blocks"]'
  ),
  (
    'burnout-prone-high-achiever',
    'Burnout-Prone High Achiever',
    'High performers who push hard but struggle with sustainability',
    '{"work_pattern": "intense", "recovery_needs": "critical", "productivity_style": "all_out"}',
    '["High output", "Ambition", "Drive"]',
    '["Burnout cycles", "Health neglect", "Relationship strain"]',
    '["Mandatory rest days", "Energy management", "Boundary setting", "Regular check-ins"]'
  ),
  (
    'overloaded-juggler',
    'Overloaded Juggler',
    'People managing many responsibilities simultaneously',
    '{"work_pattern": "multitasking", "recovery_needs": "high", "productivity_style": "scattered"}',
    '["Versatility", "Adaptability", "Handles complexity"]',
    '["Context switching cost", "Nothing gets deep focus", "Constant overwhelm"]',
    '["Time blocking", "Priority triage", "Delegate or drop", "Focus windows"]'
  )
ON CONFLICT (code) DO NOTHING;



