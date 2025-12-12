// Decision Theater v2 + Multi-Timeline Simulation Layer - Types
// lib/boardroom/theater_v2/types.ts

export interface DecisionTree {
  id: string;
  decision_id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecisionTreeNode {
  id: string;
  tree_id: string;
  user_id: string;
  parent_node_id: string | null;
  depth: number;
  label: string;
  description: string | null;
  related_decision_option_id: string | null;
  related_timeline_id: string | null;
  pivot_at_date: string | null;
  created_at: string;
}

export interface DecisionTreeEdge {
  id: string;
  tree_id: string;
  user_id: string;
  from_node_id: string;
  to_node_id: string;
  label: string | null;
  description: string | null;
  created_at: string;
}

export interface BranchSimulationRun {
  id: string;
  tree_id: string;
  root_node_id: string;
  leaf_node_id: string;
  path_node_ids: string[];
  run_at: string;
  parameters: any | null;
  results: any | null;
  narrative_summary: string | null;
  scores: any | null;
  created_at: string;
}

export interface BranchComparison {
  id: string;
  tree_id: string;
  compared_run_ids: string[];
  created_at: string;
  summary: string | null;
  recommendation: string | null;
  key_differences: any | null;
}

export interface TreePath {
  rootNodeId: string;
  leafNodeId: string;
  pathNodeIds: string[];
}


