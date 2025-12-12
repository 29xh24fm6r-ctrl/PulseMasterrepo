-- Destiny Engine v2 + Timeline Coach v1
-- supabase/migrations/20260120_destiny_engine_v2_and_timeline_coach_v1.sql

-- ============================================
-- DESTINY TIMELINES
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text,                            -- optional short key, e.g. 'stay_in_bank', 'go_all_in_pulse'
  name text NOT NULL,                  -- 'Stay VP at Bank & Build Pulse on Side'
  description text,
  time_horizon_years numeric(4,1),     -- e.g. 1.0, 3.0, 5.0, 10.0
  archetype text,                      -- 'builder', 'explorer', 'guardian', etc.
  mythic_frame text,                   -- tie to mythic arcs, e.g. 'warrior_king', 'pilgrim', etc.
  primary_domains text[] DEFAULT '{}', -- ['work','family','money','health','pulse']
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_destiny_timelines_user_active
  ON public.destiny_timelines (user_id, is_active);

-- ============================================
-- DESTINY WAYPOINTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_waypoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES destiny_timelines(id) ON DELETE CASCADE,
  ordering integer NOT NULL,          -- 1,2,3,...
  name text NOT NULL,                 -- 'Hit $X MRR', 'Move to Y', 'Step down from bank'
  description text,
  target_date date,                   -- rough date
  related_node_id uuid REFERENCES knowledge_nodes(id),
  strategic_objective_id uuid,        -- references strategic_objectives(id) if exists
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destiny_waypoints_timeline_ordering
  ON public.destiny_waypoints (timeline_id, ordering);

-- ============================================
-- DESTINY MILESTONES
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waypoint_id uuid NOT NULL REFERENCES destiny_waypoints(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'pending',  -- 'pending','in_progress','achieved','abandoned'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destiny_milestones_waypoint
  ON public.destiny_milestones (waypoint_id);

CREATE INDEX IF NOT EXISTS idx_destiny_milestones_status
  ON public.destiny_milestones (status);

-- ============================================
-- DESTINY TIMELINE SCORES
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_timeline_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES destiny_timelines(id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  feasibility_score numeric(4,2),     -- 0-10 (based on resources, trends)
  alignment_score numeric(4,2),       -- 0-10 (with Identity/Self Mirror)
  risk_score numeric(4,2),            -- 0-10 (higher = riskier)
  emotional_fit_score numeric(4,2),   -- 0-10 (how this matches emotional patterns/preferences)
  simulation_summary jsonb,           -- results from Life Simulation engine
  narrative_summary text,             -- short LLM summary
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destiny_timeline_scores_timeline_snapshot
  ON public.destiny_timeline_scores (timeline_id, snapshot_at DESC);

-- ============================================
-- DESTINY SIMULATION RUNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES destiny_timelines(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL DEFAULT now(),
  parameters jsonb,                   -- knobs passed to Life Simulation
  results jsonb,                      -- structured outcome metrics
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destiny_simulation_runs_timeline
  ON public.destiny_simulation_runs (timeline_id, run_at DESC);

-- ============================================
-- TIMELINE COACH SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.timeline_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL,                 -- 'compare_paths','refine_path','next_steps','crisis_repath'
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  selected_timeline_ids uuid[] DEFAULT '{}',
  question text,                      -- what user asked
  response text,                      -- coach response
  summary text,                       -- one line TL;DR
  recommendations jsonb,              -- [{timeline_id, kind, action}]
  followup_actions jsonb              -- autopilot / planner ready
);

CREATE INDEX IF NOT EXISTS idx_timeline_coach_sessions_user_created
  ON public.timeline_coach_sessions (user_id, created_at DESC);

-- ============================================
-- DESTINY ANCHOR CHOICES
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_anchor_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timeline_id uuid NOT NULL REFERENCES destiny_timelines(id),
  chosen_at timestamptz NOT NULL DEFAULT now(),
  strength text NOT NULL DEFAULT 'soft', -- 'soft' (exploring) | 'firm' (committed)
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destiny_anchor_choices_user_chosen
  ON public.destiny_anchor_choices (user_id, chosen_at DESC);


