-- Creative Cortex v2
-- supabase/migrations/20260120_creative_cortex_v2.sql

-- ============================================
-- CREATIVE SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  topic text NOT NULL,                  -- human label
  context jsonb,                        -- { workspaceThreadId, projectId, destinyArcId, etc. }
  goal text,                            -- "what are we trying to achieve?"

  domain text,                          -- 'work', 'pulse_product', 'relationships', 'health', 'finance', etc.
  mode text,                            -- 'brainstorm', 'refine', 'rescue', 'strategy', etc.

  status text NOT NULL DEFAULT 'open',  -- 'open', 'in_progress', 'completed', 'archived'

  meta jsonb                            -- extra knobs, user preferences for this session
);

CREATE INDEX IF NOT EXISTS idx_creative_sessions_user
  ON public.creative_sessions (user_id, created_at);

-- ============================================
-- CREATIVE IDEAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  title text NOT NULL,
  description text NOT NULL,

  category text,                        -- 'feature', 'script', 'deal_strategy', 'habit_experiment', etc.
  tags text[],

  raw_payload jsonb,                    -- full structured representation (steps, variations, etc.)

  score_overall numeric,                -- 0..1 viability
  score_alignment numeric,              -- destiny/values alignment
  score_impact numeric,                 -- potential impact
  score_feasibility numeric,            -- realistic given context
  score_energy_fit numeric,             -- somatic/emotional fit

  status text NOT NULL DEFAULT 'proposed',    -- 'proposed', 'selected', 'in_progress', 'implemented', 'discarded'
  status_reason text
);

CREATE INDEX IF NOT EXISTS idx_creative_ideas_session
  ON public.creative_ideas (session_id);

CREATE INDEX IF NOT EXISTS idx_creative_ideas_user_status
  ON public.creative_ideas (user_id, status);

-- ============================================
-- CREATIVE ARTIFACTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  idea_id uuid REFERENCES creative_ideas(id) ON DELETE SET NULL,
  session_id uuid REFERENCES creative_sessions(id) ON DELETE SET NULL,

  kind text NOT NULL,                   -- 'email_script', 'sales_pitch', 'dashboard_spec', 'habit_protocol', etc.
  title text NOT NULL,
  content jsonb,                        -- structured (sections, markdown, blocks)

  linked_workspace_thread_id uuid,      -- optional
  linked_project_id uuid,               -- optional

  quality_score numeric,                -- 0..1 (meta evaluation)
  usage_metrics jsonb                   -- later: times used, clicked, etc.
);

CREATE INDEX IF NOT EXISTS idx_creative_artifacts_user
  ON public.creative_artifacts (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_creative_artifacts_idea
  ON public.creative_artifacts (idea_id);

-- ============================================
-- CREATIVE EVALUATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  idea_id uuid REFERENCES creative_ideas(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES creative_artifacts(id) ON DELETE CASCADE,

  evaluator text NOT NULL,              -- 'user', 'destiny_engine', 'culture_engine', 'simulation', etc.
  scores jsonb,                         -- arbitrary scoring dimensions
  comments text,
  decision text                         -- 'prioritize', 'park', 'drop', etc.
);

CREATE INDEX IF NOT EXISTS idx_creative_evaluations_user
  ON public.creative_evaluations (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_creative_evaluations_idea
  ON public.creative_evaluations (idea_id);

-- ============================================
-- CREATIVE PATTERNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  pattern_key text NOT NULL,            -- e.g. 'deal_structuring', 'product_design', 'relationship_repair'
  description text,                     -- human summary

  characteristics jsonb,                -- what successful ideas share (structure, tone, risk profile)
  anti_patterns jsonb,                  -- what to avoid based on failed ideas

  recommendations jsonb                 -- meta-guidelines when generating new ideas
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_creative_patterns_user_key
  ON public.creative_patterns (user_id, pattern_key);


