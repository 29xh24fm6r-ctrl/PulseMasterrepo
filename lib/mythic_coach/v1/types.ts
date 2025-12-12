// Mythic Coach v1 - Types
// lib/mythic_coach/v1/types.ts

export interface MythicTrainingTarget {
  archetypeId: string;
  mode: 'grow' | 'stabilize' | 'cool';
  reason: string;
}

export interface MythicTrainingFocus {
  primaryTargets: MythicTrainingTarget[];
  secondaryTargets: MythicTrainingTarget[];
  rationale: string;
}


