// Relational Mind Types
// lib/relational_mind/types.ts

export interface RelationalIdentityInput {
  contactId?: string;
  externalRef?: string;
  displayName: string;
  role?: string;
  domain?: string;
}

export interface TheoryOfMindSnapshot {
  perceivedState: {
    relationshipHealth?: number;
    trustLevel?: number;
    tensionLevel?: number;
    connectionFrequency?: number;
    reciprocityScore?: number;
    mode?: string;
    recentEvents?: any;
    other?: any;
  };
  riskFlags?: any;
  opportunityFlags?: any;
}

export interface RelationalPredictionInput {
  relationalIdentityId: string;
  context: any;
  horizon: 'immediate' | 'short_term' | 'long_term';
}

export interface EmpathicResponseStyle {
  detectedUserState?: any;
  detectedOtherState?: any;
  chosenStyle: {
    tone: string;
    pace: string;
    warmth: string;
    directness: string;
    coachProfileHint?: string;
  };
  suggestedMessage?: any;
}


