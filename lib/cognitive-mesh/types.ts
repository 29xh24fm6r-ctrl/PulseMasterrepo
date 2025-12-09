// Third Brain v3: Cognitive Mesh Types

export type FragmentType = 
  | 'observation'   // Something noticed/recorded
  | 'commitment'    // Promise, deadline, agreement
  | 'insight'       // Realization or discovery
  | 'question'      // Open question to explore
  | 'preference'    // User preference learned
  | 'fact'          // Factual information
  | 'emotion';      // Emotional state

export type TimeScope = 
  | 'moment'        // Right now, ephemeral
  | 'day'           // Relevant today
  | 'week'          // This week
  | 'long_term'     // Months/years
  | 'evergreen';    // Always relevant

export type EntityType = 
  | 'person'
  | 'deal'
  | 'goal'
  | 'habit'
  | 'project'
  | 'company'
  | 'topic'
  | 'value'
  | 'emotion'
  | 'place'
  | 'event';

export type RelationType = 
  | 'works_with'
  | 'related_to'
  | 'blocks'
  | 'supports'
  | 'part_of'
  | 'depends_on'
  | 'conflicts_with'
  | 'married_to'
  | 'reports_to'
  | 'friends_with'
  | 'competes_with'
  | 'caused_by'
  | 'leads_to';

export type InsightCategory = 
  | 'pattern'
  | 'recommendation'
  | 'warning'
  | 'opportunity'
  | 'reflection';

export type PatternType = 
  | 'energy'        // When user has high/low energy
  | 'productivity'  // What makes user productive
  | 'avoidance'     // What user avoids
  | 'preference'    // Consistent preferences
  | 'trigger'       // What triggers certain behaviors
  | 'strength'      // User's strengths
  | 'weakness';     // Areas for growth

// Database row types
export interface RawEvent {
  id: string;
  user_id: string;
  source: string;
  source_id?: string;
  occurred_at: string;
  payload: Record<string, any>;
  created_at: string;
  processed: boolean;
  processing_error?: string;
}

export interface MemoryFragment {
  id: string;
  user_id: string;
  raw_event_id?: string;
  fragment_type: FragmentType;
  content: string;
  metadata: Record<string, any>;
  importance: number;
  time_scope?: TimeScope;
  occurred_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Entity {
  id: string;
  user_id: string;
  entity_type: EntityType;
  name: string;
  aliases: string[];
  canonical_key?: string;
  description?: string;
  metadata: Record<string, any>;
  importance: number;
  first_seen_at?: string;
  last_seen_at?: string;
  mention_count: number;
  created_at: string;
  updated_at: string;
}

export interface EntityEdge {
  id: string;
  user_id: string;
  from_entity_id: string;
  to_entity_id: string;
  relation_type: RelationType;
  weight: number;
  bidirectional: boolean;
  metadata: Record<string, any>;
  evidence_fragment_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  category: InsightCategory;
  subcategory?: string;
  title: string;
  body: string;
  importance: number;
  confidence: number;
  actionable: boolean;
  suggested_action?: string;
  metadata: Record<string, any>;
  source_fragment_ids: string[];
  source_entity_ids: string[];
  created_at: string;
  expires_at?: string;
  status: 'pending' | 'accepted' | 'dismissed' | 'acted_on';
  dismissed_at?: string;
  dismissed_reason?: string;
}

export interface UserPattern {
  id: string;
  user_id: string;
  pattern_type: PatternType;
  name: string;
  description: string;
  confidence: number;
  evidence_count: number;
  metadata: Record<string, any>;
  first_observed_at: string;
  last_observed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContextSnapshot {
  id: string;
  user_id: string;
  snapshot_type: 'daily' | 'weekly' | 'session' | 'triggered';
  snapshot_date?: string;
  context_data: Record<string, any>;
  active_entities: string[];
  active_goals: string[];
  energy_level?: number;
  mood?: string;
  created_at: string;
}

// Input types for creating records
export interface CreateRawEventInput {
  source: string;
  source_id?: string;
  occurred_at?: string;
  payload: Record<string, any>;
}

export interface CreateFragmentInput {
  fragment_type: FragmentType;
  content: string;
  metadata?: Record<string, any>;
  importance?: number;
  time_scope?: TimeScope;
  occurred_at?: string;
  raw_event_id?: string;
}

export interface CreateEntityInput {
  entity_type: EntityType;
  name: string;
  aliases?: string[];
  canonical_key?: string;
  description?: string;
  metadata?: Record<string, any>;
  importance?: number;
}

export interface CreateEdgeInput {
  from_entity_id: string;
  to_entity_id: string;
  relation_type: RelationType;
  weight?: number;
  bidirectional?: boolean;
  metadata?: Record<string, any>;
}

// Query types
export interface SemanticSearchOptions {
  query: string;
  limit?: number;
  minImportance?: number;
  fragmentTypes?: FragmentType[];
  timeScope?: TimeScope;
  since?: string;
}

export interface EntitySearchOptions {
  query?: string;
  entityTypes?: EntityType[];
  minImportance?: number;
  limit?: number;
}

export interface GraphTraversalOptions {
  startEntityId: string;
  relationTypes?: RelationType[];
  maxDepth?: number;
  minWeight?: number;
}