-- Career Ascension Engine v1
-- supabase/migrations/20251211_career_ascension_v1.sql

-- 1) Career track per job node
CREATE TABLE IF NOT EXISTS career_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_graph_node_id uuid REFERENCES job_graph_nodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS career_tracks_job_default_idx
ON career_tracks (job_graph_node_id)
WHERE is_default = true;

-- 2) Levels within a career track (belts)
CREATE TABLE IF NOT EXISTS career_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_track_id uuid REFERENCES career_tracks(id) ON DELETE CASCADE,
  level_index int NOT NULL,
  code text NOT NULL,      -- 'rookie' | 'operator' | 'pro' | 'elite' | 'legend'
  label text NOT NULL,
  description text,

  min_overall_score numeric,   -- 0..1 from job_scorecards.overall_score
  min_days_at_or_above int DEFAULT 0,
  min_total_xp bigint DEFAULT 0,

  focus_kpis jsonb,            -- ["deep_work_hours", "deal_touchpoints"]

  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS career_levels_track_index_idx
ON career_levels (career_track_id, level_index);

-- 3) User's current status in a career track
CREATE TABLE IF NOT EXISTS user_career_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_track_id uuid REFERENCES career_tracks(id) ON DELETE CASCADE,
  current_level_id uuid REFERENCES career_levels(id),
  current_level_index int,
  progress_score numeric DEFAULT 0.0,
  last_evaluated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, career_track_id)
);

CREATE INDEX IF NOT EXISTS user_career_progress_user_idx
ON user_career_progress (user_id);

-- 4) Career mission templates (per track/level)
CREATE TABLE IF NOT EXISTS career_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_track_id uuid REFERENCES career_tracks(id) ON DELETE CASCADE,
  career_level_id uuid REFERENCES career_levels(id) ON DELETE CASCADE,

  code text NOT NULL,
  title text NOT NULL,
  description text,
  difficulty text,              -- 'easy' | 'medium' | 'hard'
  recommended_frequency text,   -- 'daily' | 'weekly' | 'once'

  definition jsonb,             -- mission definition payload

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS career_missions_level_idx
ON career_missions (career_level_id);

CREATE INDEX IF NOT EXISTS career_missions_track_idx
ON career_missions (career_track_id);

-- 5) User mission instances
CREATE TABLE IF NOT EXISTS user_career_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_mission_id uuid REFERENCES career_missions(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'assigned',  -- 'assigned' | 'in_progress' | 'completed' | 'expired'
  assigned_date date NOT NULL,
  due_date date,
  completed_at timestamptz,
  progress jsonb,
  reward_xp bigint DEFAULT 0,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_career_missions_user_status_idx
ON user_career_missions (user_id, status, assigned_date);

CREATE INDEX IF NOT EXISTS user_career_missions_assigned_date_idx
ON user_career_missions (user_id, assigned_date);




