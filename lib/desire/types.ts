// Desire Modeling Types
// lib/desire/types.ts

export type DesireEntityType = 'self' | 'contact';

export interface DesireSignal {
  userId: string;
  entityType: DesireEntityType;
  entityId: string;
  source: string;
  signalTime: Date;
  context?: string;
  kind: string;
  description?: string;
  features?: Record<string, any>;
  valence?: number; // -1..1
  weight?: number;
}

export interface DesireProfile {
  userId: string;
  entityType: DesireEntityType;
  entityId: string;
  summary?: string;
  priorities?: Record<string, number>;
  avoidanceTriggers?: Array<{
    label: string;
    contexts?: string[];
    severity: number; // 0..1
  }>;
  preferredStyles?: any;
  rewardSignals?: any;
  longTermDesires?: Array<{ label: string; strength: number }>;
  shortTermPreferences?: any;
}


