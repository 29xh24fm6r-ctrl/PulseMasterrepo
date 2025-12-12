-- Strategic Mind v1 - Meta-Agent Coordination & Higher-Order Goal Resolver
-- supabase/migrations/20260120_strategic_mind_v1.sql

-- ============================================
-- GOAL HIERARCHY (Hierarchical Goals Across Timescales)
-- ============================================

CREATE TABLE IF NOT EXISTS public.goal_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  timescale text NOT NULL,            -- 'lifetime', 'five_year', 'year', 'quarter', 'month', 'week', 'day'
  parent_goal_id uuid REFERENCES goal_hierarchy(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,

  importance numeric NOT NULL DEFAULT 0.5,  -- 0..1 (user-facing perceived importance)
  strategic_weight numeric NOT NULL DEFAULT 0.5, -- 0..1 (what Strategic Mind thinks it should weigh)

  alignment jsonb,                     -- { values, identity, destiny, relationships, health, finance }
  feasibility jsonb,                   -- { time, energy, skills, risk }
  dependencies jsonb,                  -- list of other goal ids / external constraints
  blockers jsonb,                      -- recognized blockers

  status text NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'abandoned'
  tags text[]
);

CREATE INDEX IF NOT EXISTS idx_goal_hierarchy_user_timescale
  ON public.goal_hierarchy (user_id, timescale);

-- ============================================
-- STRATEGIC STATE SNAPSHOTS (Brain-Wide Stance)
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  snapshot_time timestamptz NOT NULL DEFAULT now(),

  active_goals jsonb,         -- which goals across timescales are currently "in play"
  dominant_needs jsonb,       -- e.g. rest, focus, relationship repair, financial push
  predicted_risks jsonb,      -- short/medium-term risks the mind is tracking
  opportunities jsonb,        -- special windows (energy, timing, social, market)

  subsystem_signals jsonb,    -- aggregated signals from all subsystems at that snapshot
  conflicts jsonb,            -- summary of active conflicts
  chosen_equilibrium jsonb,   -- chosen compromise / stance

  confidence numeric NOT NULL DEFAULT 0.5
);

CREATE INDEX IF NOT EXISTS idx_strategic_state_snapshots_user_time
  ON public.strategic_state_snapshots (user_id, snapshot_time DESC);

-- ============================================
-- STRATEGIC CONFLICTS (Where Goals/Needs/Constraints Collide)
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  conflict_type text NOT NULL,       -- 'time', 'energy', 'emotion', 'relationship', 'culture', 'identity', 'finance'
  description text NOT NULL,

  severity numeric NOT NULL,         -- 0..1
  timescale text,                    -- optional: time horizon of conflict

  involved_goals jsonb,             -- list of goals and roles involved
  subsystem_inputs jsonb,           -- references to emotion, somatic, ethnographic, relational signals
  recommended_resolutions jsonb     -- candidate resolution strategies
);

CREATE INDEX IF NOT EXISTS idx_strategic_conflicts_user_time
  ON public.strategic_conflicts (user_id, created_at DESC);

-- ============================================
-- STRATEGIC EQUILIBRIA (Proposed Equilibrium States)
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_equilibria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  timescale text NOT NULL,          -- 'day', 'week', 'month', 'quarter', 'year'
  equilibrium jsonb NOT NULL,       -- description of the chosen compromise / stance
  rationale jsonb NOT NULL,         -- why this equilibrium
  predicted_outcomes jsonb,         -- expected effects across domains (work, relationships, health, etc.)

  confidence numeric NOT NULL DEFAULT 0.6
);

CREATE INDEX IF NOT EXISTS idx_strategic_equilibria_user_time
  ON public.strategic_equilibria (user_id, created_at DESC);

-- ============================================
-- STRATEGY RECOMMENDATIONS (Actual Steps Produced)
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategy_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  title text NOT NULL,
  description text NOT NULL,

  timescale text NOT NULL,      -- 'day', 'week', 'month', 'quarter'
  priority numeric NOT NULL,    -- 0..1 (relative priority among strategies)
  scope text,                   -- 'work', 'relationships', 'health', 'finance', 'meta', 'mixed'

  context jsonb,                -- references to goals, conflicts, subsystems
  recommended_actions jsonb,    -- array of atomic actions like: { targetSystem, actionKind, payload }

  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'applied'
  status_context jsonb
);

CREATE INDEX IF NOT EXISTS idx_strategy_recommendations_user_time
  ON public.strategy_recommendations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_strategy_recommendations_user_status
  ON public.strategy_recommendations (user_id, status);

