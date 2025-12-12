// Behavioral Prediction Types
// lib/behavior/types.ts

export type BehaviorEntityType = 'self' | 'contact';

export interface BehaviorPrediction {
  userId: string;
  entityType: BehaviorEntityType;
  entityId: string;
  targetType: string;   // 'goal', 'task', 'habit', 'interaction', 'relationship', 'response'
  targetId?: string;
  horizon: string;      // 'today', 'this_week', '24h', '7d', '30d'
  outcomeLabel: string; // 'will_complete', 'will_skip', 'will_reply', 'likely_conflict', ...
  probability: number;  // 0..1
  reasoningSummary?: string;
  recommendedIntervention?: any;
}


