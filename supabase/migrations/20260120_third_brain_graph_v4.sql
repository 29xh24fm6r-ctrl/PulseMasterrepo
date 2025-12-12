-- Third Brain Graph v4 + Memory Civilization v1
-- supabase/migrations/20260120_third_brain_graph_v4.sql

-- ============================================
-- KNOWLEDGE NODES
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,               -- 'person', 'project', 'deal', 'note', 'task', 'event', 'goal', 'concept', 'place', 'memory'
  external_ref text,                -- optional: 'crm:contact:123', 'calendar:event:xyz'
  title text NOT NULL,
  summary text,
  tags text[] DEFAULT '{}',
  importance numeric(4,2) DEFAULT 0.0,    -- 0-10 relative importance
  last_touched_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user_kind
  ON public.knowledge_nodes (user_id, kind);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user_importance
  ON public.knowledge_nodes (user_id, importance DESC, last_touched_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_external_ref
  ON public.knowledge_nodes (external_ref) WHERE external_ref IS NOT NULL;

-- ============================================
-- KNOWLEDGE EDGES
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  relation text NOT NULL,           -- 'related_to', 'part_of', 'depends_on', 'conflicts_with', 'supports', 'mentor_of', 'owns', etc.
  weight numeric(4,2) DEFAULT 1.0,  -- relationship strength
  direction text NOT NULL DEFAULT 'directed', -- 'directed' | 'undirected'
  created_at timestamptz DEFAULT now(),
  CHECK (from_node_id != to_node_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_from
  ON public.knowledge_edges (from_node_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_to
  ON public.knowledge_edges (to_node_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_user
  ON public.knowledge_edges (user_id);

-- ============================================
-- KNOWLEDGE CONTEXTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,             -- 'meeting', 'day', 'session', 'document', 'call', 'journal'
  title text,
  description text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_contexts_user_kind
  ON public.knowledge_contexts (user_id, kind);

-- ============================================
-- KNOWLEDGE CONTEXT LINKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_context_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES knowledge_contexts(id) ON DELETE CASCADE,
  node_id uuid REFERENCES knowledge_nodes(id),
  edge_id uuid REFERENCES knowledge_edges(id),
  created_at timestamptz DEFAULT now(),
  CHECK (
    (node_id IS NOT NULL)::int + (edge_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_knowledge_context_links_context
  ON public.knowledge_context_links (context_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_context_links_node
  ON public.knowledge_context_links (node_id);

-- ============================================
-- MEMORY EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id uuid REFERENCES knowledge_nodes(id),
  context_id uuid REFERENCES knowledge_contexts(id),
  source text NOT NULL,          -- 'email', 'calendar', 'note', 'voice', 'task', 'deal', 'manual'
  action text NOT NULL,          -- 'created', 'updated', 'mentioned', 'viewed', 'linked'
  weight numeric(4,2) DEFAULT 1.0,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_events_user_node
  ON public.memory_events (user_id, node_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_events_user_occurred
  ON public.memory_events (user_id, occurred_at DESC);

-- ============================================
-- CIVILIZATION DOMAINS
-- ============================================

CREATE TABLE IF NOT EXISTS public.civilization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,              -- 'work', 'family', 'pulse', 'health', 'money', 'learning', etc.
  name text NOT NULL,             -- 'Work', 'Family', 'Pulse OS', ...
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_civilization_domains_user
  ON public.civilization_domains (user_id, is_active);

-- ============================================
-- CIVILIZATION DOMAIN MAPPINGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.civilization_domain_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES civilization_domains(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  weight numeric(4,2) DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (domain_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_civilization_domain_mappings_domain
  ON public.civilization_domain_mappings (domain_id);

CREATE INDEX IF NOT EXISTS idx_civilization_domain_mappings_node
  ON public.civilization_domain_mappings (node_id);

-- ============================================
-- CIVILIZATION DOMAIN STATE
-- ============================================

CREATE TABLE IF NOT EXISTS public.civilization_domain_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES civilization_domains(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  activity_score numeric(5,2),     -- current engagement/attention (0-100)
  tension_score numeric(5,2),      -- conflicts/overload (0-100)
  health_score numeric(5,2),       -- overall domain health (0-100)
  summary text,                    -- human-readable summary at that date
  created_at timestamptz DEFAULT now(),
  UNIQUE (domain_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_civilization_domain_state_domain_date
  ON public.civilization_domain_state (domain_id, snapshot_date DESC);


