-- Life Simulation Engine v2 - Digital Twin & What-If Scenarios
-- supabase/migrations/20251211_life_simulation_v2.sql

-- 1.1 Simulation Models
CREATE TABLE IF NOT EXISTS simulation_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT 'v2',
  state jsonb NOT NULL,                  -- Digital twin state snapshot
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulation_models_user_idx
  ON simulation_models(user_id, created_at DESC);

-- 1.2 Simulation Runs
CREATE TABLE IF NOT EXISTS simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_name text NOT NULL,
  parameters jsonb,
  output jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulation_runs_user_idx
  ON simulation_runs(user_id, created_at DESC);

-- 1.3 Simulation Metrics
CREATE TABLE IF NOT EXISTS simulation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  label text NOT NULL,
  value numeric,
  day_offset int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulation_metrics_simulation_idx
  ON simulation_metrics(simulation_id, day_offset);




