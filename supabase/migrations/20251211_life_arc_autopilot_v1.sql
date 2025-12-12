-- Life Arc Autopilot v1
-- supabase/migrations/20251211_life_arc_autopilot_v1.sql

-- 1.1 Life Arc Autopilot Runs
CREATE TABLE IF NOT EXISTS life_arc_autopilot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_type text NOT NULL,             -- 'daily' | 'weekly'
  run_date date NOT NULL,             -- date for which this run applies
  status text NOT NULL DEFAULT 'success',  -- 'success' | 'error'
  details jsonb DEFAULT '{}'::jsonb,  -- e.g. selected arcs/quests, error msg
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_arc_autopilot_runs_user_idx
  ON life_arc_autopilot_runs(user_id, run_date DESC, run_type);

-- 1.2 Life Arc Objectives
CREATE TABLE IF NOT EXISTS life_arc_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arc_id uuid NOT NULL REFERENCES life_arcs(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,      -- Monday of that week
  summary text NOT NULL,              -- objective summary in human language
  target_quests int DEFAULT 0,        -- how many quests to advance/complete
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, arc_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS life_arc_objectives_user_idx
  ON life_arc_objectives(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS life_arc_objectives_arc_idx
  ON life_arc_objectives(arc_id, week_start_date DESC);

-- 1.3 Life Arc Daily Focus
CREATE TABLE IF NOT EXISTS life_arc_daily_focus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_date date NOT NULL,
  arc_id uuid NOT NULL REFERENCES life_arcs(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES life_arc_quests(id) ON DELETE SET NULL,
  autopilot_action_id uuid,           -- optional link into Autopilot actions table
  status text NOT NULL DEFAULT 'planned',   -- planned|in_progress|done|skipped
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_arc_daily_focus_user_idx
  ON life_arc_daily_focus(user_id, focus_date DESC);

CREATE INDEX IF NOT EXISTS life_arc_daily_focus_date_idx
  ON life_arc_daily_focus(focus_date, status);

-- 1.4 Life Arc Risk Events
CREATE TABLE IF NOT EXISTS life_arc_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arc_id uuid NOT NULL REFERENCES life_arcs(id) ON DELETE CASCADE,
  risk_type text NOT NULL,           -- 'stagnation' | 'regression' | 'overload' | 'conflict'
  severity int NOT NULL DEFAULT 1,   -- 1–5
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_arc_risk_events_user_idx
  ON life_arc_risk_events(user_id, arc_id, created_at DESC);

CREATE INDEX IF NOT EXISTS life_arc_risk_events_severity_idx
  ON life_arc_risk_events(user_id, severity DESC) WHERE severity >= 3;




