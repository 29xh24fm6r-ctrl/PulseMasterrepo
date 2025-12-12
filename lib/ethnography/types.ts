// Ethnographic Intelligence Types
// lib/ethnography/types.ts

export type CulturalDomain = 'institution' | 'industry' | 'team' | 'leader' | 'relationship';

export interface CulturalSignalInput {
  domain: CulturalDomain;
  source: string;
  content: any;
  weight?: number;
}

export interface CulturalProfile {
  norms?: any;
  riskTolerance?: any;
  communicationStyle?: any;
  approvalDynamics?: any;
  decisionPatterns?: any;
  culturalRules?: any;
  culturalRedFlags?: any;
  culturalOpportunities?: any;
}

export interface CulturalPredictionInput {
  domain: CulturalDomain;
  context: any;
}


