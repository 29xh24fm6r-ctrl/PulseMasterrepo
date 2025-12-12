-- Theory of Mind + Social Graph Intelligence v1
-- supabase/migrations/20260120_theory_of_mind_and_social_graph_v1.sql

-- ============================================
-- MIND MODELS
-- ============================================

CREATE TABLE IF NOT EXISTS public.mind_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  entity_type text NOT NULL,          -- 'self' or 'contact'
  entity_id text NOT NULL,            -- user_id or contact_id
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),

  summary text,                       -- plain language summary: "how this person tends to think/act"
  cognitive_style jsonb,              -- e.g. "direct vs indirect", "detail vs big-picture"
  emotional_pattern jsonb,            -- stress reactivity, baseline mood, volatility
  conflict_pattern jsonb,             -- how they handle disagreement
  trust_model jsonb,                  -- how they tend to trust/doubt others, esp. user
  perception_of_user jsonb,           -- inferred view of the user (for contacts)
  typical_reactions jsonb,            -- patterns: "when X happens, they tend to Y"
  constraints jsonb,                  -- internal constraints: time, bandwidth, fears, obligations

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_mind_models_user_entity
  ON public.mind_models (user_id, entity_type, entity_id);

-- ============================================
-- SOCIAL NODES
-- ============================================

CREATE TABLE IF NOT EXISTS public.social_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  node_type text NOT NULL,         -- 'self' or 'contact'
  node_id text NOT NULL,           -- user_id or contact_id
  label text,                      -- display name (cached)
  roles text[],                    -- 'spouse', 'child', 'boss', 'client', 'friend', etc.
  importance_score numeric,        -- 0..1: how central to the user's life
  last_interaction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, node_type, node_id)
);

CREATE INDEX IF NOT EXISTS idx_social_nodes_user
  ON public.social_nodes (user_id);

-- ============================================
-- SOCIAL EDGES
-- ============================================

CREATE TABLE IF NOT EXISTS public.social_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  from_node_type text NOT NULL,     -- 'self' or 'contact'
  from_node_id text NOT NULL,
  to_node_type text NOT NULL,       -- 'contact' for v1
  to_node_id text NOT NULL,

  relationship_type text,           -- 'spouse', 'child', 'coworker', 'client', etc.
  strength numeric,                 -- 0..1 closeness / bond strength
  trust numeric,                    -- 0..1
  tension numeric,                  -- 0..1 (0 calm, 1 very tense)
  drift numeric,                    -- 0..1 (0 stable, 1 drifting apart)
  influence numeric,                -- 0..1 (how much this person shapes user's path)
  positivity numeric,               -- 0..1 average emotional positivity

  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_edges_user
  ON public.social_edges (user_id);

CREATE INDEX IF NOT EXISTS idx_social_edges_from
  ON public.social_edges (user_id, from_node_type, from_node_id);

CREATE INDEX IF NOT EXISTS idx_social_edges_to
  ON public.social_edges (user_id, to_node_type, to_node_id);

-- ============================================
-- SOCIAL INSIGHTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.social_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  generated_at timestamptz NOT NULL DEFAULT now(),
  scope text NOT NULL DEFAULT 'snapshot',  -- 'snapshot', 'weekly', etc.

  summary text,
  top_relationships jsonb,       -- top N key relationships with reason
  drift_warnings jsonb,          -- [{ contactId, label, severity, details }]
  tension_hotspots jsonb,        -- [{ contactId, label, severity, details }]
  reachout_opportunities jsonb,  -- [{ contactId, label, attractiveness, details }]

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_insights_user_time
  ON public.social_insights (user_id, generated_at);


