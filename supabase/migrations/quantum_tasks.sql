-- Quantum Task Engine: Task Ontology Table
-- supabase/migrations/quantum_tasks.sql

CREATE TABLE IF NOT EXISTS quantum_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic task info
  title TEXT NOT NULL,
  description TEXT,
  raw_input TEXT, -- Original user input
  
  -- Task ontology
  domain TEXT NOT NULL CHECK (domain IN ('work', 'relationships', 'finance', 'life', 'strategy')),
  task_type TEXT NOT NULL, -- e.g., 'communication', 'creation', 'analysis', 'maintenance'
  intent TEXT, -- What the user really wants to achieve
  
  -- Requirements
  identity_mode_needed TEXT, -- Which archetype mode is best for this
  energy_requirement NUMERIC NOT NULL DEFAULT 0.5 CHECK (energy_requirement >= 0 AND energy_requirement <= 1),
  time_requirement_minutes INTEGER,
  cognitive_difficulty NUMERIC DEFAULT 0.5 CHECK (cognitive_difficulty >= 0 AND cognitive_difficulty <= 1),
  
  -- Context
  emotional_resistance NUMERIC DEFAULT 0 CHECK (emotional_resistance >= 0 AND emotional_resistance <= 1),
  relationship_relevance TEXT[], -- Array of person IDs
  strategic_importance NUMERIC DEFAULT 0.5 CHECK (strategic_importance >= 0 AND strategic_importance <= 1),
  
  -- Dependencies
  depends_on UUID[], -- Array of task IDs
  blocks UUID[], -- Tasks that depend on this
  
  -- Micro-steps (fractured)
  micro_steps JSONB DEFAULT '[]'::jsonb,
  
  -- Liquidity (dynamic flow)
  current_day DATE,
  current_identity_mode TEXT,
  current_energy_slot TEXT, -- 'morning', 'afternoon', 'evening'
  current_time_slice_id UUID,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred', 'cancelled')),
  priority NUMERIC DEFAULT 0.5 CHECK (priority >= 0 AND priority <= 1),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Cortex integration
  cortex_context_snapshot JSONB, -- Snapshot of context when created
);

CREATE INDEX IF NOT EXISTS idx_quantum_tasks_user_id ON quantum_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_quantum_tasks_status ON quantum_tasks(status);
CREATE INDEX IF NOT EXISTS idx_quantum_tasks_domain ON quantum_tasks(domain);
CREATE INDEX IF NOT EXISTS idx_quantum_tasks_current_day ON quantum_tasks(current_day);
CREATE INDEX IF NOT EXISTS idx_quantum_tasks_priority ON quantum_tasks(priority DESC);

-- Update trigger
CREATE OR REPLACE FUNCTION update_quantum_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quantum_tasks_updated_at
  BEFORE UPDATE ON quantum_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_quantum_tasks_updated_at();



