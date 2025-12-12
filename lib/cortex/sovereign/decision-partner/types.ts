// Autonomous Decision Partner v1 Types
// lib/cortex/sovereign/decision-partner/types.ts

export interface DecisionScenario {
  id: string;
  userId: string;
  createdAt: string;
  title: string;
  description: string;
  options: DecisionOption[];
  status: "draft" | "analyzing" | "analyzed" | "resolved";
}

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
}

export interface DecisionAnalysisResult {
  scenarioId: string;
  analyzedAt: string;
  options: DecisionOptionAnalysis[];
  summary: string;
  recommendation?: {
    optionId: string;
    confidence: number;
    reasoning: string;
  };
  unknowns: string[];
  suggestedNextSteps: string[];
}

export interface DecisionOptionAnalysis {
  optionId: string;
  label: string;
  projectedBenefits: string[];
  projectedCosts: string[];
  identityAlignment: {
    score: number; // 0-1
    reasoning: string;
  };
  riskProfile: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
  relationshipImpact: {
    description: string;
    affectedRelationships: string[];
  };
  financialImpact: {
    description: string;
    estimatedCost?: number;
    estimatedBenefit?: number;
  };
  emotionalImpact: {
    description: string;
    projectedEmotion: string;
  };
  timeImpact: {
    description: string;
    estimatedHours?: number;
  };
  overallScore: number; // 0-1, composite score
}



