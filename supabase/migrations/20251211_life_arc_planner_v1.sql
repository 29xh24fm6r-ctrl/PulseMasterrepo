-- Life Arc Planner v1 - Main Quest Engine
-- supabase/migrations/20251211_life_arc_planner_v1.sql

-- 1.1 Life Arcs
CREATE TABLE IF NOT EXISTS life_arcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,                 -- "healing", "career_level_up", "financial_reset"
  name text NOT NULL,                -- display name
  description text,
  status text NOT NULL DEFAULT 'active',  -- 'active' | 'paused' | 'completed'
  priority int NOT NULL DEFAULT 1,   -- 1–3 (1 = top)
  start_date date DEFAULT CURRENT_DATE,
  target_date date,                  -- rough goal date (e.g. 90 days)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_arcs_user_idx
  ON life_arcs(user_id, status, priority);

CREATE UNIQUE INDEX IF NOT EXISTS life_arcs_user_key_active_idx
  ON life_arcs(user_id, key) WHERE status = 'active';

-- 1.2 Life Arc Sources
CREATE TABLE IF NOT EXISTS life_arc_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id uuid NOT NULL REFERENCES life_arcs(id) ON DELETE CASCADE,
  source_type text NOT NULL,         -- 'career', 'persona_soul_line', 'habit', 'finance', etc.
  source_id uuid,                    -- e.g. persona_user_arc.id, career track id
  weight numeric(4,2) DEFAULT 1.0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_arc_sources_arc_idx
  ON life_arc_sources(arc_id);

-- 1.3 Life Arc Quests
CREATE TABLE IF NOT EXISTS life_arc_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id uuid NOT NULL REFERENCES life_arcs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',   -- open|in_progress|done|dropped
  due_date date,
  difficulty int DEFAULT 1,              -- 1–5
  impact int DEFAULT 1,                  -- 1–5
  source_hint text,                      -- e.g. "career", "confidant", "finance"
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_arc_quests_arc_idx
  ON life_arc_quests(arc_id, status, due_date);

CREATE INDEX IF NOT EXISTS life_arc_quests_user_arc_idx
  ON life_arc_quests(arc_id, status) WHERE status IN ('open', 'in_progress');

-- 1.4 Life Arc Checkpoints
CREATE TABLE IF NOT EXISTS life_arc_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id uuid NOT NULL REFERENCES life_arcs(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  summary text,                         -- short human summary
  progress_score int,                   -- 0–100 subjective
  risk_flags text[],                    -- ['burnout', 'relapse_risk', ...]
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_arc_checkpoints_arc_idx
  ON life_arc_checkpoints(arc_id, date DESC);




