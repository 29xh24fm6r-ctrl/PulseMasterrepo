-- Executive Council Mode v1 - Multi-Subsystem Decision Council
-- supabase/migrations/20260120_executive_council_mode_v1.sql

-- ============================================
-- COUNCIL SESSIONS (One Council Convening)
-- ============================================

CREATE TABLE IF NOT EXISTS public.council_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  status text NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'

  topic text NOT NULL,             -- short label
  question text NOT NULL,          -- user's question or decision problem
  context jsonb,                   -- structured decision context

  trigger_source text,             -- 'user_request', 'strategic_mind', 'coach', 'timeline', 'autopilot'
  timescale text,                  -- 'day', 'week', 'month', 'quarter', 'year', 'lifetime'
  importance numeric NOT NULL DEFAULT 0.5, -- 0..1 subjective importance

  snapshot_id uuid,                -- optional link to strategic_state_snapshots.id
  equilibrium_id uuid              -- optional link to strategic_equilibria.id
);

CREATE INDEX IF NOT EXISTS idx_council_sessions_user_time
  ON public.council_sessions (user_id, created_at DESC);

-- ============================================
-- COUNCIL MEMBERS (Catalog of Council Roles)
-- ============================================

CREATE TABLE IF NOT EXISTS public.council_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  role_id text NOT NULL,           -- 'strategist', 'ethnographer', 'relational', 'financial', 'health', 'identity', 'destiny', 'ethics'
  display_name text NOT NULL,      -- 'Strategic Mind', 'Culture Advisor', 'Relationship Guardian', etc.
  description text NOT NULL,

  enabled boolean NOT NULL DEFAULT true,
  weight numeric NOT NULL DEFAULT 1.0,   -- voting / influence weight 0..2

  config jsonb                        -- role-specific config (e.g., "always weigh family heavier")
);

CREATE INDEX IF NOT EXISTS idx_council_members_user
  ON public.council_members (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_council_members_user_role
  ON public.council_members (user_id, role_id);

-- ============================================
-- COUNCIL OPINIONS (Each Member's Response)
-- ============================================

CREATE TABLE IF NOT EXISTS public.council_opinions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  member_role_id text NOT NULL,        -- matches council_members.role_id

  stance text NOT NULL,                -- 'strong_support', 'support', 'neutral', 'concerned', 'oppose', 'block'
  recommendation text NOT NULL,        -- plain language recommendation
  rationale jsonb,                     -- { upside, risks, key_factors }

  confidence numeric NOT NULL,         -- 0..1
  suggested_conditions jsonb,          -- "ok if X", "only if Y", etc.

  raw_payload jsonb                    -- full model output for debugging/learning
);

CREATE INDEX IF NOT EXISTS idx_council_opinions_session
  ON public.council_opinions (session_id);

-- ============================================
-- COUNCIL CONSENSUS (Synthesized Outcome)
-- ============================================

CREATE TABLE IF NOT EXISTS public.council_consensus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  consensus_recommendation text NOT NULL, -- final suggested decision
  summary jsonb,                          -- { mainArgumentsFor, mainArgumentsAgainst, keyTradeoffs }
  voting_breakdown jsonb,                 -- aggregated stance by member
  overall_confidence numeric NOT NULL,    -- 0..1
  risk_profile jsonb                      -- { shortTerm, longTerm, relational, financial, health }
);

CREATE INDEX IF NOT EXISTS idx_council_consensus_session
  ON public.council_consensus (session_id);

-- ============================================
-- COUNCIL DECISION DOSSIERS (Archive)
-- ============================================

CREATE TABLE IF NOT EXISTS public.council_decision_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  session_id uuid REFERENCES council_sessions(id) ON DELETE SET NULL,

  decision_label text NOT NULL,
  question text NOT NULL,
  context jsonb,

  consensus_id uuid REFERENCES council_consensus(id) ON DELETE SET NULL,

  user_choice text,           -- what user actually did
  user_notes text,
  outcome jsonb,              -- later: what happened
  learnings jsonb             -- fed back into Wisdom Engine
);

CREATE INDEX IF NOT EXISTS idx_council_decision_dossiers_user_time
  ON public.council_decision_dossiers (user_id, created_at DESC);


