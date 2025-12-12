-- Pulse Strategy Engine v1 - The Master Game Plan
-- supabase/migrations/20251211_pulse_strategy_engine_v1.sql

-- 1.1 Strategy Snapshots
CREATE TABLE IF NOT EXISTS strategy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horizon_days int NOT NULL,         -- e.g. 30, 90, 180
  created_at timestamptz DEFAULT now(),
  model jsonb NOT NULL,              -- structured strategy model for this snapshot
  summary text NOT NULL,             -- short human-readable summary
  chosen_path_key text,              -- key of selected strategy path
  confidence numeric(4,2) DEFAULT 0.5
);

CREATE INDEX IF NOT EXISTS strategy_snapshots_user_idx
  ON strategy_snapshots(user_id, created_at DESC);

-- 1.2 Strategy Paths
CREATE TABLE IF NOT EXISTS strategy_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES strategy_snapshots(id) ON DELETE CASCADE,
  key text NOT NULL,                 -- 'healing_focus', 'career_sprint', 'balanced_ascent', etc.
  name text NOT NULL,
  description text NOT NULL,
  pros text NOT NULL,
  cons text NOT NULL,
  risk_level int NOT NULL DEFAULT 1, -- 1–5
  opportunity_level int NOT NULL DEFAULT 1,
  score numeric(4,2) NOT NULL DEFAULT 0.0,
  is_selected boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS strategy_paths_snapshot_idx
  ON strategy_paths(snapshot_id, score DESC);

-- 1.3 Strategy Pillars
CREATE TABLE IF NOT EXISTS strategy_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES strategy_snapshots(id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES strategy_paths(id) ON DELETE CASCADE,
  title text NOT NULL,               -- e.g. "Stabilize sleep & stress"
  description text,
  category text,                     -- 'healing', 'career', 'relationship', 'identity', etc.
  priority int DEFAULT 1,            -- 1–3
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategy_pillars_snapshot_idx
  ON strategy_pillars(snapshot_id, priority);

-- 1.4 Strategy Actions
CREATE TABLE IF NOT EXISTS strategy_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id uuid NOT NULL REFERENCES strategy_pillars(id) ON DELETE CASCADE,
  life_arc_id uuid REFERENCES life_arcs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  cadence text,                      -- 'daily', '3x_week', 'weekly', 'once'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategy_actions_pillar_idx
  ON strategy_actions(pillar_id);




