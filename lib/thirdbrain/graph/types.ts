// Third Brain Graph v4 - Types
// lib/thirdbrain/graph/types.ts

export type NodeKind = 'person' | 'project' | 'deal' | 'note' | 'task' | 'event' | 'goal' | 'concept' | 'place' | 'memory';

export type EdgeRelation = 'related_to' | 'part_of' | 'depends_on' | 'conflicts_with' | 'supports' | 'mentor_of' | 'owns' | 'created_by' | 'involves' | 'leads_to';

export type ContextKind = 'meeting' | 'day' | 'session' | 'document' | 'call' | 'journal';

export type MemoryEventSource = 'email' | 'calendar' | 'note' | 'voice' | 'task' | 'deal' | 'manual' | 'crm' | 'financial';

export type MemoryEventAction = 'created' | 'updated' | 'mentioned' | 'viewed' | 'linked' | 'completed' | 'archived';

export interface KnowledgeNode {
  id: string;
  user_id: string;
  kind: NodeKind;
  external_ref: string | null;
  title: string;
  summary: string | null;
  tags: string[];
  importance: number;
  last_touched_at: string | null;
  created_at: string;
}

export interface KnowledgeEdge {
  id: string;
  user_id: string;
  from_node_id: string;
  to_node_id: string;
  relation: EdgeRelation;
  weight: number;
  direction: 'directed' | 'undirected';
  created_at: string;
}

export interface KnowledgeContext {
  id: string;
  user_id: string;
  kind: ContextKind;
  title: string | null;
  description: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface KnowledgeContextLink {
  id: string;
  user_id: string;
  context_id: string;
  node_id: string | null;
  edge_id: string | null;
  created_at: string;
}

export interface MemoryEvent {
  id: string;
  user_id: string;
  node_id: string | null;
  context_id: string | null;
  source: MemoryEventSource;
  action: MemoryEventAction;
  weight: number;
  occurred_at: string;
  created_at: string;
}

export interface GraphQueryResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  scores?: Record<string, number>;
}

export interface CivilizationDomain {
  id: string;
  user_id: string;
  key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CivilizationDomainMapping {
  id: string;
  user_id: string;
  domain_id: string;
  node_id: string;
  weight: number;
  created_at: string;
}

export interface CivilizationDomainState {
  id: string;
  domain_id: string;
  snapshot_date: string;
  activity_score: number | null;
  tension_score: number | null;
  health_score: number | null;
  summary: string | null;
  created_at: string;
}


