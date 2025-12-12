// Theory of Mind Types
// lib/mind/types.ts

export type MindEntityType = 'self' | 'contact';

export interface MindModel {
  userId: string;
  entityType: MindEntityType;
  entityId: string;
  summary?: string;
  cognitiveStyle?: any;
  emotionalPattern?: any;
  conflictPattern?: any;
  trustModel?: any;
  perceptionOfUser?: any;
  typicalReactions?: any;
  constraints?: any;
}


