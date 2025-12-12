-- Pulse Brain Registry - Subsystems Tracking
-- supabase/migrations/20260120_brain_subsystems_v1.sql

CREATE TABLE IF NOT EXISTS public.brain_subsystems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,           -- 'global_workspace', 'desire_model', etc.
  name text NOT NULL,
  region text NOT NULL,        -- 'prefrontal', 'neocortex', 'limbic', 'hippocampus', 'third_brain', 'cerebellum', 'brainstem', 'agi_kernel', 'social', 'ethnographic'
  status text NOT NULL DEFAULT 'planned',   -- 'planned', 'partial', 'active', 'degraded'
  version text NOT NULL DEFAULT 'v1',
  description text,
  config jsonb,                -- subsystem-specific configs
  metrics jsonb,               -- uptime, usage, quality scores
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_brain_subsystems_user
  ON public.brain_subsystems (user_id);

CREATE INDEX IF NOT EXISTS idx_brain_subsystems_region
  ON public.brain_subsystems (region);

CREATE INDEX IF NOT EXISTS idx_brain_subsystems_status
  ON public.brain_subsystems (status);


