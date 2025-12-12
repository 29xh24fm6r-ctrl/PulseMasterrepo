-- Decision Theater v2 + Multi-Timeline Simulation Layer v1
-- supabase/migrations/20260120_decision_theater_v2_multitimeline_layer.sql

-- ============================================
-- DECISION TREES
-- ============================================

CREATE TABLE IF NOT EXISTS public.decision_trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,                 -- 'Quit vs Stay – Multi-Stage', etc.
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_trees_decision
  ON public.decision_trees (decision_id);

CREATE INDEX IF NOT EXISTS idx_decision_trees_user
  ON public.decision_trees (user_id);

-- ============================================
-- DECISION TREE NODES
-- ============================================

CREATE TABLE IF NOT EXISTS public.decision_tree_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES decision_trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_node_id uuid REFERENCES decision_tree_nodes(id) ON DELETE CASCADE,
  depth integer NOT NULL DEFAULT 0,        -- root = 0
  label text NOT NULL,                     -- 'Now', '18 months pivot', etc.
  description text,
  related_decision_option_id uuid REFERENCES decision_options(id),
  related_timeline_id uuid REFERENCES destiny_timelines(id),
  pivot_at_date date,                      -- when this node's choice/change happens
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_tree_nodes_tree
  ON public.decision_tree_nodes (tree_id);

CREATE INDEX IF NOT EXISTS idx_decision_tree_nodes_parent
  ON public.decision_tree_nodes (parent_node_id);

CREATE INDEX IF NOT EXISTS idx_decision_tree_nodes_tree_depth
  ON public.decision_tree_nodes (tree_id, depth);

-- ============================================
-- DECISION TREE EDGES
-- ============================================

CREATE TABLE IF NOT EXISTS public.decision_tree_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES decision_trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES decision_tree_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES decision_tree_nodes(id) ON DELETE CASCADE,
  label text,                              -- 'Stay 3 years', 'Pivot at 18 months', etc.
  description text,
  created_at timestamptz DEFAULT now(),
  CHECK (from_node_id != to_node_id)
);

CREATE INDEX IF NOT EXISTS idx_decision_tree_edges_tree
  ON public.decision_tree_edges (tree_id);

CREATE INDEX IF NOT EXISTS idx_decision_tree_edges_from
  ON public.decision_tree_edges (from_node_id);

CREATE INDEX IF NOT EXISTS idx_decision_tree_edges_to
  ON public.decision_tree_edges (to_node_id);

-- ============================================
-- BRANCH SIMULATION RUNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.branch_simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES decision_trees(id) ON DELETE CASCADE,
  root_node_id uuid NOT NULL REFERENCES decision_tree_nodes(id) ON DELETE CASCADE,
  leaf_node_id uuid NOT NULL REFERENCES decision_tree_nodes(id) ON DELETE CASCADE,
  path_node_ids uuid[] NOT NULL,               -- ordered root → leaf
  run_at timestamptz NOT NULL DEFAULT now(),
  parameters jsonb,                            -- combined knobs (timeline & decision assumptions)
  results jsonb,                               -- numeric outcomes, e.g. cash, stress, etc.
  narrative_summary text,
  scores jsonb,                                -- {risk, upside, downside, regret_risk, etc.}
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_simulation_runs_tree
  ON public.branch_simulation_runs (tree_id, run_at DESC);

CREATE INDEX IF NOT EXISTS idx_branch_simulation_runs_root
  ON public.branch_simulation_runs (root_node_id);

-- ============================================
-- BRANCH COMPARISONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.branch_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES decision_trees(id) ON DELETE CASCADE,
  compared_run_ids uuid[] NOT NULL,           -- which branch_simulation_runs were compared
  created_at timestamptz DEFAULT now(),
  summary text,                               -- short description
  recommendation text,                        -- recommended branch/path
  key_differences jsonb                       -- structured summary of differences
);

CREATE INDEX IF NOT EXISTS idx_branch_comparisons_tree
  ON public.branch_comparisons (tree_id, created_at DESC);


