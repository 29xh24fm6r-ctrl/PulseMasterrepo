-- ============================================
-- PULSE TOOL ALIASES
-- Per-user custom tool name aliases
-- Resolves friendly names to canonical tool names
-- ============================================

CREATE TABLE IF NOT EXISTS pulse_tool_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- The alias name the user types (e.g. "health", "check")
  alias TEXT NOT NULL,

  -- The canonical tool name it maps to (e.g. "pulse.health", "state.inspect")
  canonical_tool TEXT NOT NULL,

  -- Active flag (soft-disable without deleting)
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One alias per user
  UNIQUE(user_id, alias)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_tool_aliases_lookup
  ON pulse_tool_aliases(user_id, alias) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tool_aliases_canonical
  ON pulse_tool_aliases(user_id, canonical_tool);

-- RLS (idempotent: drop-then-create to survive re-runs)
ALTER TABLE pulse_tool_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tool aliases" ON pulse_tool_aliases;
CREATE POLICY "Users can view own tool aliases"
  ON pulse_tool_aliases FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access to tool aliases" ON pulse_tool_aliases;
CREATE POLICY "Service role full access to tool aliases"
  ON pulse_tool_aliases FOR ALL
  USING (auth.role() = 'service_role');
