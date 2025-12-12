-- Mythic Arc Tables Migration
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/008_mythic_arc_tables.sql

-- Mythic Arcs (Hero's Journey style arcs)
CREATE TABLE IF NOT EXISTS mythic_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  current_act INTEGER NOT NULL DEFAULT 1 CHECK (current_act >= 1 AND current_act <= 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  logline TEXT,
  call_to_adventure TEXT,
  trials JSONB DEFAULT '[]'::jsonb, -- Array of {title, description, act}
  allies JSONB DEFAULT '[]'::jsonb, -- Array of {name, role}
  shadow JSONB DEFAULT '{}'::jsonb, -- {pattern, description}
  identity_claim TEXT,
  transformation TEXT,
  open_loops JSONB DEFAULT '[]'::jsonb, -- Array of unresolved threads
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mythic_arcs_user_status ON mythic_arcs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mythic_arcs_updated ON mythic_arcs(user_id, updated_at DESC);

-- Mythic Sessions (extend existing table or create new structure)
-- Check if we need to alter existing mythic_sessions or create new fields
DO $$
BEGIN
  -- Add columns if they don't exist (for compatibility with existing table)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mythic_sessions') THEN
    ALTER TABLE mythic_sessions ADD COLUMN IF NOT EXISTS arc_id UUID REFERENCES mythic_arcs(id) ON DELETE SET NULL;
    ALTER TABLE mythic_sessions ADD COLUMN IF NOT EXISTS transcript TEXT;
    ALTER TABLE mythic_sessions ADD COLUMN IF NOT EXISTS summary TEXT;
    ALTER TABLE mythic_sessions ADD COLUMN IF NOT EXISTS extracted JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE mythic_sessions ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'voice';
    -- Ensure user_id references auth.users if it doesn't already
    -- (If it references users table, that's okay - both work)
  END IF;
END $$;

-- Mythic Quests
CREATE TABLE IF NOT EXISTS mythic_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES mythic_arcs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty INTEGER DEFAULT 2 CHECK (difficulty >= 1 AND difficulty <= 5),
  reward_xp INTEGER DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mythic_quests_user_arc ON mythic_quests(user_id, arc_id);
CREATE INDEX IF NOT EXISTS idx_mythic_quests_status ON mythic_quests(user_id, status);

-- Mythic Rituals
CREATE TABLE IF NOT EXISTS mythic_rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES mythic_arcs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  why TEXT,
  cadence TEXT DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mythic_rituals_user_arc ON mythic_rituals(user_id, arc_id);
CREATE INDEX IF NOT EXISTS idx_mythic_rituals_status ON mythic_rituals(user_id, status);

-- Life Canon Entries
CREATE TABLE IF NOT EXISTS life_canon_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES mythic_arcs(id) ON DELETE SET NULL,
  session_id UUID,
  title TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'mythic',
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_canon_entries_user ON life_canon_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_life_canon_entries_arc ON life_canon_entries(arc_id) WHERE arc_id IS NOT NULL;

-- RLS Policies
ALTER TABLE mythic_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mythic_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mythic_rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_canon_entries ENABLE ROW LEVEL SECURITY;

-- User-only policies (using auth.uid())
CREATE POLICY user_only_mythic_arcs ON mythic_arcs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_only_mythic_quests ON mythic_quests
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_only_mythic_rituals ON mythic_rituals
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_only_life_canon ON life_canon_entries
  FOR ALL USING (user_id = auth.uid());

-- RLS policy for mythic_sessions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mythic_sessions') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE mythic_sessions ENABLE ROW LEVEL SECURITY;
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS user_only_mythic_sessions ON mythic_sessions;
    -- Create new policy using user_id = auth.uid()
    CREATE POLICY user_only_mythic_sessions ON mythic_sessions
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

