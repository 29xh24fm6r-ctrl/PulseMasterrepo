// Pulse Simulation Engine v3 Types
// lib/simulation/v3/types.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { AutonomyAction } from "@/lib/cortex/autonomy/v3";
import { IdentityArchetype } from "@/lib/identity/v3/types";

export interface SimulationInputV3 {
  userId: string;
  horizonDays: number; // 30, 60, 90, 180
  scenarios: SimulationScenarioV3[];
  includeCausalModeling?: boolean;
  includeChoiceModeling?: boolean;
}

export interface SimulationScenarioV3 {
  id: string;
  title: string;
  description?: string;
  parameterAdjustments: {
    energy?: number;
    emotionalVolatility?: number;
    taskThroughput?: number;
    socialEngagement?: number;
    spendingBehavior?: number;
    stressSensitivity?: number;
    identityArchetype?: IdentityArchetype;
    relationshipFocus?: "maintain" | "deepen" | "repair" | "expand";
    workFocus?: "execute" | "strategize" | "build" | "optimize";
  };
  choiceModeling?: {
    type: "archetype_shift" | "relationship_decision" | "career_path" | "financial_decision";
    parameters: Record<string, any>;
  };
}

export interface SimulationOutputV3 {
  userId: string;
  horizonDays: number;
  scenarios: ScenarioResultV3[];
  generatedAt: string;
  causalInsights?: CausalInsight[];
}

export interface ScenarioResultV3 {
  id: string;
  title: string;
  predictedArcs: PredictedArcV3[];
  riskWindows: RiskWindowV3[];
  opportunityWindows: OpportunityWindowV3[];
  recommendedActions: AutonomyAction[];
  identityProjections: IdentityProjection[];
  relationshipProjections: RelationshipProjection[];
  financialProjections: FinancialProjection[];
  efBottleneckAnalysis?: EFBottleneckAnalysis;
  summary: string;
}

export interface PredictedArcV3 {
  domain: "work" | "relationships" | "finance" | "life" | "strategy";
  type: string;
  startDate: string;
  endDate: string;
  trajectory: "improving" | "declining" | "stable" | "volatile";
  confidence: number;
  description: string;
  causalFactors?: string[];
  metadata?: Record<string, any>;
}

export interface RiskWindowV3 {
  id: string;
  domain: string;
  startDate: string;
  endDate: string;
  severity: "low" | "medium" | "high";
  description: string;
  causalChain?: string[]; // What leads to this risk
  mitigation: string[];
  metadata?: Record<string, any>;
}

export interface OpportunityWindowV3 {
  id: string;
  domain: string;
  startDate: string;
  endDate: string;
  priority: "low" | "medium" | "high";
  description: string;
  causalChain?: string[]; // What creates this opportunity
  suggestedActions: string[];
  metadata?: Record<string, any>;
}

export interface IdentityProjection {
  currentArchetype: IdentityArchetype;
  projectedArchetype: IdentityArchetype;
  transitionProbability: number; // 0-1
  transitionDate?: string;
  supportingFactors: string[];
  blockingFactors: string[];
}

export interface RelationshipProjection {
  personId: string;
  personName: string;
  currentState: "active" | "cooling" | "neglected" | "conflict";
  projectedState: "active" | "cooling" | "neglected" | "conflict" | "repaired";
  transitionProbability: number;
  transitionDate?: string;
  causalFactors: string[];
}

export interface FinancialProjection {
  currentState: "stable" | "stress" | "growth";
  projectedState: "stable" | "stress" | "growth" | "crisis";
  cashflowCurve: Array<{ date: string; amount: number }>;
  riskFactors: string[];
  opportunityFactors: string[];
}

export interface EFBottleneckAnalysis {
  bottlenecks: Array<{
    type: "energy" | "time" | "cognitive_load" | "emotional_capacity";
    severity: "low" | "medium" | "high";
    description: string;
    impact: string[];
    recommendations: string[];
  }>;
}

export interface CausalInsight {
  cause: string;
  effect: string;
  strength: number; // 0-1
  delay: number; // days
  description: string;
}



