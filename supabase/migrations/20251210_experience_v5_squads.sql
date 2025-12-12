-- Experience v5: Multi-Human Shared Universe
-- supabase/migrations/20251210_experience_v5_squads.sql

-- Organizations (if not already present)
CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- Squads (small groups)
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (squad_id, user_id)
);

-- Shared missions
CREATE TABLE IF NOT EXISTS squad_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'planned', 'active', 'completed'
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_mission_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_mission_id UUID REFERENCES squad_missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started','in_progress','done'
  progress_percent INT DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (squad_mission_id, user_id)
);

-- Presence
CREATE TABLE IF NOT EXISTS squad_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'online', -- 'online','focus','away'
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (squad_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON squad_members(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_id ON squad_members(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_missions_squad_id ON squad_missions(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_mission_members_mission_id ON squad_mission_members(squad_mission_id);
CREATE INDEX IF NOT EXISTS idx_squad_presence_squad_id ON squad_presence(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_presence_user_id ON squad_presence(user_id);

-- RLS Policies
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_mission_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_presence ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see orgs where they are members
CREATE POLICY "Users can view orgs they belong to" ON orgs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
      AND org_members.user_id = auth.uid()::text
    )
  );

-- RLS: Users can only see org_members for orgs they belong to
CREATE POLICY "Users can view org members of their orgs" ON org_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()::text
    )
  );

-- RLS: Users can only see squads where they are members
CREATE POLICY "Users can view squads they belong to" ON squads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_members.squad_id = squads.id
      AND squad_members.user_id = auth.uid()::text
    )
  );

-- RLS: Users can only see squad members of their squads
CREATE POLICY "Users can view squad members of their squads" ON squad_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()::text
    )
  );

-- RLS: Users can only see missions of their squads
CREATE POLICY "Users can view missions of their squads" ON squad_missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_members.squad_id = squad_missions.squad_id
      AND squad_members.user_id = auth.uid()::text
    )
  );

-- RLS: Users can only see presence of their squads
CREATE POLICY "Users can view presence of their squads" ON squad_presence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_members.squad_id = squad_presence.squad_id
      AND squad_members.user_id = auth.uid()::text
    )
  );

-- Update triggers
CREATE OR REPLACE FUNCTION update_squads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_squads_updated_at
  BEFORE UPDATE ON squads
  FOR EACH ROW
  EXECUTE FUNCTION update_squads_updated_at();

CREATE OR REPLACE FUNCTION update_squad_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_squad_missions_updated_at
  BEFORE UPDATE ON squad_missions
  FOR EACH ROW
  EXECUTE FUNCTION update_squad_missions_updated_at();



