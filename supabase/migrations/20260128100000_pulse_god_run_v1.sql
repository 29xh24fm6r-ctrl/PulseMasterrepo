-- ============================================
-- PULSE GOD-RUN V1: Safe Intelligence Activation
-- Memory, Decisions, Trust State tables
-- Idempotent: all statements use IF NOT EXISTS / DROP IF EXISTS
-- ============================================

-- ============================================
-- PHASE 2: CONTINUOUS MEMORY STREAM
-- Structured memory events (NOT a junk drawer)
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Memory classification
  memory_type TEXT NOT NULL CHECK (memory_type IN ('insight', 'decision', 'preference', 'fact', 'observation')),

  -- Content
  content TEXT NOT NULL,
  source TEXT NOT NULL,  -- 'mcp', 'calendar', 'email', 'manual', etc.

  -- Metadata
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  expires_at TIMESTAMPTZ,  -- Optional TTL for ephemeral memories

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Flexible metadata
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for memory queries
CREATE INDEX IF NOT EXISTS idx_memory_user_type ON pulse_memory_events(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_user_created ON pulse_memory_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_user_importance ON pulse_memory_events(user_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_memory_search ON pulse_memory_events USING gin(to_tsvector('english', content));

-- RLS (idempotent: drop-then-create)
ALTER TABLE pulse_memory_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memory events" ON pulse_memory_events;
CREATE POLICY "Users can view own memory events"
  ON pulse_memory_events FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access to memory events" ON pulse_memory_events;
CREATE POLICY "Service role full access to memory events"
  ON pulse_memory_events FOR ALL
  USING (auth.role() = 'service_role');


-- ============================================
-- PHASE 5: DECISION JOURNAL (WISDOM LAYER)
-- Tracks decisions and reasoning for learning
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- The decision
  decision TEXT NOT NULL,
  reasoning TEXT,

  -- Alternatives considered
  alternatives JSONB DEFAULT '[]'::jsonb,

  -- Outcome tracking (filled in later)
  outcome TEXT,  -- 'success', 'partial', 'failure', 'unknown'
  outcome_notes TEXT,
  outcome_recorded_at TIMESTAMPTZ,

  -- Context
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'manual',  -- 'mcp', 'autopilot', 'manual'

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Flexible metadata
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for decision queries
CREATE INDEX IF NOT EXISTS idx_decisions_user_created ON pulse_decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_user_outcome ON pulse_decisions(user_id, outcome) WHERE outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decisions_search ON pulse_decisions USING gin(to_tsvector('english', decision));

-- RLS (idempotent: drop-then-create)
ALTER TABLE pulse_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own decisions" ON pulse_decisions;
CREATE POLICY "Users can view own decisions"
  ON pulse_decisions FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access to decisions" ON pulse_decisions;
CREATE POLICY "Service role full access to decisions"
  ON pulse_decisions FOR ALL
  USING (auth.role() = 'service_role');


-- ============================================
-- PHASE 6: TRUST ESCALATION STATE
-- Tracks autonomy level per user (LOCKED, no auto-advance)
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_trust_state (
  user_id TEXT PRIMARY KEY,

  -- Autonomy level (0-5, starts at 0, manual advancement only)
  -- 0: Observe only (read)
  -- 1: Propose only (suggest, no action)
  -- 2: Assist (execute with confirmation)
  -- 3: Delegate simple (auto-execute low-risk)
  -- 4: Delegate complex (auto-execute medium-risk)
  -- 5: Full autonomy (reserved, not implemented)
  autonomy_level INT NOT NULL DEFAULT 0 CHECK (autonomy_level >= 0 AND autonomy_level <= 5),

  -- When was this level granted
  level_granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level_granted_by TEXT,  -- 'user', 'admin', 'system'

  -- Trust score (computed from confidence calibration)
  trust_score FLOAT DEFAULT 0.5 CHECK (trust_score >= 0 AND trust_score <= 1),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (idempotent: drop-then-create)
ALTER TABLE pulse_trust_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trust state" ON pulse_trust_state;
CREATE POLICY "Users can view own trust state"
  ON pulse_trust_state FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access to trust state" ON pulse_trust_state;
CREATE POLICY "Service role full access to trust state"
  ON pulse_trust_state FOR ALL
  USING (auth.role() = 'service_role');


-- ============================================
-- PHASE 8: MULTI-AGENT SCAFFOLDING
-- Data structures only (no execution yet)
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Agent identity
  agent_name TEXT NOT NULL,
  agent_type TEXT NOT NULL,  -- 'observer', 'planner', 'executor', 'guardian'

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Status
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, agent_name)
);

-- RLS (idempotent: drop-then-create)
ALTER TABLE pulse_agent_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agents" ON pulse_agent_registry;
CREATE POLICY "Users can view own agents"
  ON pulse_agent_registry FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access to agents" ON pulse_agent_registry;
CREATE POLICY "Service role full access to agents"
  ON pulse_agent_registry FOR ALL
  USING (auth.role() = 'service_role');


-- ============================================
-- TRIGGER CANDIDATES TABLE
-- Stores detected nudge candidates for review
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_trigger_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Trigger details
  trigger_type TEXT NOT NULL,  -- 'upcoming_commitment', 'overdue_task', 'pattern_detected'
  message TEXT NOT NULL,

  -- Source context
  source_event_id UUID,
  source_type TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'dismissed', 'acted')),

  -- Timestamps
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,

  -- Metadata
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_triggers_user_status ON pulse_trigger_candidates(user_id, status);
CREATE INDEX IF NOT EXISTS idx_triggers_user_detected ON pulse_trigger_candidates(user_id, detected_at DESC);

-- RLS (idempotent: drop-then-create)
ALTER TABLE pulse_trigger_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own triggers" ON pulse_trigger_candidates;
CREATE POLICY "Users can view own triggers"
  ON pulse_trigger_candidates FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access to triggers" ON pulse_trigger_candidates;
CREATE POLICY "Service role full access to triggers"
  ON pulse_trigger_candidates FOR ALL
  USING (auth.role() = 'service_role');
