// Executive Function Cortex Types
// The action layer that turns knowledge into concrete, sequenced actions

export type ActionType =
  | 'task'           // Create/complete a task
  | 'communication'  // Send email, message, call
  | 'meeting'        // Schedule or prepare for meeting
  | 'follow_up'      // Follow up with someone
  | 'decision'       // Make a decision
  | 'research'       // Research/learn something
  | 'reflection'     // Journal, review, think
  | 'habit'          // Habit-related action
  | 'health'         // Health/wellness action
  | 'admin';         // Administrative task

export type ActionUrgency = 'immediate' | 'today' | 'this_week' | 'someday';
export type ActionImportance = 'critical' | 'high' | 'medium' | 'low';
export type EnergyLevel = 'high' | 'medium' | 'low' | 'recovery';
export type TimeBlock = 'morning' | 'midday' | 'afternoon' | 'evening' | 'anytime';

export interface GeneratedAction {
  id: string;
  action_type: ActionType;
  title: string;
  description: string;
  reasoning: string;           // Why this action is suggested
  urgency: ActionUrgency;
  importance: ActionImportance;
  estimated_minutes: number;
  energy_required: EnergyLevel;
  best_time_block: TimeBlock;
  dependencies: string[];      // IDs of actions that must come first
  related_entity_ids: string[];
  related_fragment_ids: string[];
  confidence: number;          // 0-1 how confident we are this is right
  metadata: Record<string, any>;
}

export interface PrioritizedAction extends GeneratedAction {
  priority_score: number;      // 0-100 combined score
  urgency_score: number;
  importance_score: number;
  energy_match_score: number;
  time_match_score: number;
  context_relevance_score: number;
}

export interface ActionSequence {
  id: string;
  user_id: string;
  sequence_type: 'daily' | 'focus_block' | 'energy_based' | 'project';
  title: string;
  actions: PrioritizedAction[];
  total_minutes: number;
  energy_flow: EnergyLevel[];  // Expected energy progression
  created_at: string;
  valid_until: string;
}

export interface EnergyState {
  current_level: EnergyLevel;
  trend: 'rising' | 'stable' | 'falling';
  last_check_in: string;
  factors: {
    sleep_quality?: number;
    exercise_today?: boolean;
    meals_eaten?: number;
    stress_level?: number;
    focus_sessions?: number;
  };
  optimal_task_types: ActionType[];
  avoid_task_types: ActionType[];
}

export interface Commitment {
  id: string;
  user_id: string;
  commitment_type: 'promise' | 'deadline' | 'goal' | 'habit';
  title: string;
  description?: string;
  made_to?: string;            // Person or entity
  made_at: string;
  due_at?: string;
  status: 'active' | 'completed' | 'broken' | 'renegotiated';
  progress: number;            // 0-100
  check_ins: CommitmentCheckIn[];
  related_entity_ids: string[];
  source_fragment_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CommitmentCheckIn {
  timestamp: string;
  progress: number;
  notes?: string;
  blockers?: string[];
}

export interface FollowThroughNudge {
  id: string;
  commitment_id: string;
  nudge_type: 'reminder' | 'encouragement' | 'warning' | 'celebration';
  message: string;
  urgency: ActionUrgency;
  suggested_action?: GeneratedAction;
  created_at: string;
  acknowledged: boolean;
}

// Database row types
export interface DbGeneratedAction {
  id: string;
  user_id: string;
  action_type: ActionType;
  title: string;
  description: string;
  reasoning: string;
  urgency: ActionUrgency;
  importance: ActionImportance;
  estimated_minutes: number;
  energy_required: EnergyLevel;
  best_time_block: TimeBlock;
  dependencies: string[];
  related_entity_ids: string[];
  related_fragment_ids: string[];
  confidence: number;
  priority_score: number;
  metadata: Record<string, any>;
  status: 'suggested' | 'accepted' | 'rejected' | 'completed' | 'deferred';
  created_at: string;
  expires_at?: string;
  completed_at?: string;
}

export interface DbCommitment {
  id: string;
  user_id: string;
  commitment_type: string;
  title: string;
  description?: string;
  made_to?: string;
  made_at: string;
  due_at?: string;
  status: string;
  progress: number;
  check_ins: CommitmentCheckIn[];
  related_entity_ids: string[];
  source_fragment_ids: string[];
  created_at: string;
  updated_at: string;
}

// Input types
export interface GenerateActionsInput {
  context_query?: string;
  entity_ids?: string[];
  include_calendar?: boolean;
  include_tasks?: boolean;
  include_commitments?: boolean;
  max_actions?: number;
  time_horizon?: 'today' | 'week' | 'month';
}

export interface PrioritizeInput {
  actions: GeneratedAction[];
  energy_state?: EnergyState;
  available_minutes?: number;
  time_block?: TimeBlock;
  focus_areas?: string[];
}

export interface SequenceInput {
  actions: PrioritizedAction[];
  sequence_type: 'daily' | 'focus_block' | 'energy_based';
  start_energy: EnergyLevel;
  available_minutes: number;
}