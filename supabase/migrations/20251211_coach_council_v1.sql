-- Coach Council Orchestrator v1
-- supabase/migrations/20251211_coach_council_v1.sql

-- 1.1 Coach Council Sessions
CREATE TABLE IF NOT EXISTS coach_council_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id text,                    -- optional external id
  primary_coach_id text NOT NULL,     -- coach the user explicitly addressed
  council_mode text NOT NULL,         -- "advisory" | "emotional_support" | "performance" | "life_navigation" | "crisis"
  trigger_reason text NOT NULL,       -- "multi_dimension", "stress", etc.
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_council_sessions_user_idx
  ON coach_council_sessions(user_id, created_at DESC);

-- 1.2 Coach Council Members
CREATE TABLE IF NOT EXISTS coach_council_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES coach_council_sessions(id) ON DELETE CASCADE,
  coach_id text NOT NULL,               -- "career", "confidant", "sales", etc.
  persona_id uuid REFERENCES voice_profiles(id) ON DELETE SET NULL,
  role text NOT NULL,                   -- "primary" | "secondary" | "observer"
  weight numeric(4,2) DEFAULT 1.0,      -- influence weight 0–2
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_council_members_session_idx
  ON coach_council_members(session_id);

-- 1.3 Coach Council Deliberations
CREATE TABLE IF NOT EXISTS coach_council_deliberations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES coach_council_sessions(id) ON DELETE CASCADE,
  coach_id text NOT NULL,
  phase text NOT NULL,                  -- "analysis" | "recommendation" | "risk"
  content jsonb NOT NULL,               -- e.g. { "analysis": "...", "steps": [...] }
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_council_deliberations_session_idx
  ON coach_council_deliberations(session_id);

-- 1.4 Coach Council Summary
CREATE TABLE IF NOT EXISTS coach_council_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES coach_council_sessions(id) ON DELETE CASCADE,
  final_answer text NOT NULL,
  summary_json jsonb,                   -- structured breakdown by coach
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS coach_council_summary_session_idx
  ON coach_council_summary(session_id);




