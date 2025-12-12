-- Global Sense of Self Mirror v1 + Creative Cortex v2
-- supabase/migrations/20260120_self_mirror_and_creative_cortex_v2.sql

-- ============================================
-- SELF MIRROR TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.self_identity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,                     -- 'system', 'mirror_session', 'weekly', 'manual'
  roles jsonb,                              -- ['banker','builder','father','founder',...]
  values jsonb,                             -- ['integrity','mastery','freedom',...]
  strengths jsonb,                          -- ['strategic thinking','resilience',...]
  vulnerabilities jsonb,                    -- ['overcommitment','conflict avoidance',...]
  self_story text,                          -- short narrative summary
  mythic_archetypes jsonb,                  -- from Mythic layer
  domain_balance jsonb,                     -- summary from Civilization domains
  overall_self_alignment numeric(4,2),      -- 0-10, system-estimated alignment
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_self_identity_snapshots_user_taken
  ON public.self_identity_snapshots (user_id, taken_at DESC);

-- ============================================

CREATE TABLE IF NOT EXISTS public.self_perception_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,             -- 'calendar','tasks','deals','habits','relationships','finance','emotion_os'
  category text NOT NULL,           -- 'followthrough','overload','avoidance','risk_taking','caregiving','learning'
  direction text NOT NULL,          -- 'supports_identity','conflicts_identity','neutral'
  weight numeric(4,2) DEFAULT 1.0,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_self_perception_signals_user_occurred
  ON public.self_perception_signals (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_self_perception_signals_user_category
  ON public.self_perception_signals (user_id, category);

-- ============================================

CREATE TABLE IF NOT EXISTS public.self_mirror_facets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,                        -- 'self_alignment','overcommitment','relationships_nourishment','health_attention'
  name text NOT NULL,
  description text,
  score numeric(5,2),                       -- 0-100 current score
  trend text,                               -- 'up','down','flat','unknown'
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_self_mirror_facets_user
  ON public.self_mirror_facets (user_id);

-- ============================================

CREATE TABLE IF NOT EXISTS public.self_mirror_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL,                  -- 'daily_glance','weekly_debrief','identity_deep_dive','crucible_review'
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  snapshot_id uuid REFERENCES self_identity_snapshots(id),
  script text,                         -- scripted prompts/questions used (for voice)
  summary text,                        -- summary of this session
  insights jsonb,                      -- [{key,value}]
  followup_actions jsonb,              -- suggestions pushed to planner/autopilot
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_self_mirror_sessions_user_started
  ON public.self_mirror_sessions (user_id, started_at DESC);

-- ============================================
-- CREATIVE CORTEX v2 TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,                    -- 'Pulse OS deck', 'Book outline', 'New dashboard concept'
  description text,
  kind text NOT NULL,                     -- 'writing','product','strategy','content','design','other'
  status text NOT NULL DEFAULT 'active',  -- 'active','paused','completed','archived'
  related_node_id uuid REFERENCES knowledge_nodes(id),  -- optional link to Third Brain
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_projects_user_status
  ON public.creative_projects (user_id, status);

-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES creative_projects(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  mode text NOT NULL,                   -- 'brainstorm','drafting','refinement','problem_solving','ideation'
  prompt text,                          -- initial question/goal from user
  context_summary text,                 -- summary of context/system inputs
  output_summary text,                  -- summary of what was produced
  created_assets jsonb,                 -- [{id, type, title}]
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_sessions_user_started
  ON public.creative_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_sessions_project
  ON public.creative_sessions (project_id);

-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES creative_projects(id) ON DELETE SET NULL,
  session_id uuid REFERENCES creative_sessions(id) ON DELETE SET NULL,
  kind text NOT NULL,                   -- 'text','outline','plan','idea_list','prompt','spec','story'
  title text,
  content text,                         -- main content text
  metadata jsonb,                       -- e.g. format hints, length, usage
  related_node_id uuid REFERENCES knowledge_nodes(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_assets_user_created
  ON public.creative_assets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_assets_project
  ON public.creative_assets (project_id);

CREATE INDEX IF NOT EXISTS idx_creative_assets_session
  ON public.creative_assets (session_id);

-- ============================================

CREATE TABLE IF NOT EXISTS public.creative_style_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,                   -- 'Pulse Spec Voice','Public Writing','Sales Emails'
  description text,
  tone text,                            -- 'direct','epic','playful','analytical', etc.
  constraints jsonb,                    -- e.g. 'avoid fluff','max 2 levels of bullets'
  examples jsonb,                       -- short text samples
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_style_profiles_user
  ON public.creative_style_profiles (user_id, is_default);


