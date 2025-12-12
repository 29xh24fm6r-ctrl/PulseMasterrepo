// Ethnographic Intelligence v1 Types
// lib/culture/types.ts

export interface CultureContext {
  id?: string;
  userId: string;
  key: string;
  name: string;
  kind: string;
  description?: string;
  priority?: number;
}

export interface CultureProfile {
  contextId: string;
  norms: any;
  communicationStyle: any;
  successMarkers: any;
  tabooBehaviors: any;
  politicalSensitivities: any;
  languagePatterns: any;
  decisionMakingStyle: any;
  hiddenRules: any;
  summary?: string;
}


