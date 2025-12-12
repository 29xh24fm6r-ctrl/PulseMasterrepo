-- Global Scoreboard & Guilds v1
-- supabase/migrations/20251211_global_scoreboard_guilds_v1.sql

-- 1) Daily global aggregates per job node (for percentiles)
CREATE TABLE IF NOT EXISTS job_score_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_graph_node_id uuid REFERENCES job_graph_nodes(id) ON DELETE CASCADE,
  date date NOT NULL,
  sample_size int NOT NULL DEFAULT 0,
  -- distribution buckets: e.g. 0-0.2, 0.2-0.4, etc.
  score_histogram jsonb,   -- { "0.0-0.2": 3, "0.2-0.4": 10, ... }
  created_at timestamptz DEFAULT now(),
  UNIQUE (job_graph_node_id, date)
);

CREATE INDEX IF NOT EXISTS job_score_aggregates_job_date_idx
ON job_score_aggregates (job_graph_node_id, date DESC);

-- 2) Guild definitions
CREATE TABLE IF NOT EXISTS guilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_graph_node_id uuid REFERENCES job_graph_nodes(id) ON DELETE CASCADE,
  code text NOT NULL,             -- 'elite_closers', 'rising_producers', etc.
  name text NOT NULL,
  description text,
  min_level_index int,            -- min career level index required
  min_score numeric,              -- min overall_score (0..1) trailing average
  is_open boolean DEFAULT true,   -- if false, invite-only later
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS guilds_job_code_idx
ON guilds (job_graph_node_id, code);

CREATE INDEX IF NOT EXISTS guilds_job_idx
ON guilds (job_graph_node_id);

-- 3) User membership in guilds
CREATE TABLE IF NOT EXISTS user_guild_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guild_id uuid REFERENCES guilds(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  role text DEFAULT 'member',   -- 'member' | 'captain' (later)
  UNIQUE (user_id, guild_id)
);

CREATE INDEX IF NOT EXISTS user_guild_memberships_user_idx
ON user_guild_memberships (user_id);

CREATE INDEX IF NOT EXISTS user_guild_memberships_guild_idx
ON user_guild_memberships (guild_id);

-- 4) Daily guild performance snapshots
CREATE TABLE IF NOT EXISTS guild_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid REFERENCES guilds(id) ON DELETE CASCADE,
  date date NOT NULL,
  member_count int NOT NULL DEFAULT 0,
  avg_score numeric,          -- average of members' job_scorecards.overall_score
  top_score numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE (guild_id, date)
);

CREATE INDEX IF NOT EXISTS guild_scorecards_guild_date_idx
ON guild_scorecards (guild_id, date DESC);




