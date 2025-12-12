// Executive Council Mode v1 - Types
// lib/executive_council/v1/types.ts

export type CouncilRoleId =
  | 'strategist'
  | 'ethnographer'
  | 'relational'
  | 'financial'
  | 'health'
  | 'identity'
  | 'destiny'
  | 'ethics';

export interface CouncilDecisionContext {
  now: string;
  userId: string;
  topic: string;
  question: string;
  timescale?: string | null;
  importance: number;
  rawContext: any;

  strategicSnapshot?: any;
  strategicEquilibrium?: any;
  narrative?: any;
  identity?: any;
  emotion?: any;
  somatic?: any;
  relationships?: any[];
  culture?: any[];
  financialState?: any;
  destinySnapshot?: any;
}

export interface CouncilOpinion {
  memberRoleId: CouncilRoleId;
  stance: string;                    // 'strong_support', etc.
  recommendation: string;
  rationale: {
    upside?: string[];
    risks?: string[];
    keyFactors?: string[];
  };
  confidence: number;                // 0..1
  suggestedConditions?: string[];
}

export interface CouncilConsensus {
  consensusRecommendation: string;
  summary: {
    mainArgumentsFor: string[];
    mainArgumentsAgainst: string[];
    keyTradeoffs: string[];
  };
  votingBreakdown: Record<string, { stance: string; confidence: number }>;
  riskProfile: {
    shortTerm: string;
    longTerm: string;
    relational: string;
    financial: string;
    health: string;
  };
  overallConfidence: number;
}


