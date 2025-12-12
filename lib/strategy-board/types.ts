// Pulse Strategy Board Types
// lib/strategy-board/types.ts

import { LifeChapter } from "@/lib/cortex/longitudinal/types";
import { IdentityArcPlan } from "@/lib/identity/v3/types";
import { RelationshipPlan } from "@/lib/domains/relationships/v2/types";
import { MicroPlan } from "@/lib/cortex/executive";
import { AutonomyAction } from "@/lib/cortex/autonomy/v3";
import { MissionProfile } from "@/lib/purpose/v1/types";
import { SocialGraph } from "@/lib/relationships/social-graph/types";
import { TimeSliceOptimization } from "@/lib/time-slicing/v1/types";
import { WeeklyPlan } from "@/lib/planning/weekly/v2/types";

export interface StrategyBoardData {
  identityArc: IdentityArcPlan;
  lifeChapters: LifeChapter[];
  keyRelationships: RelationshipPlan[];
  financialHealth: FinancialProjection;
  careerMap: CareerProjection;
  quarterlyPlan: MicroPlan[];
  strategicPriorities: StrategicPriority[];
  opportunities: StrategyOpportunity[];
  risks: StrategyRisk[];
  dailyLevers: DailyLever[];
  missionProfile: MissionProfile;
  socialGraph: SocialGraph;
  timeSlices: TimeSliceOptimization;
  weeklyPlan: WeeklyPlan;
}

export interface FinancialProjection {
  currentState: "stable" | "stress" | "growth";
  projectedState: "stable" | "stress" | "growth" | "crisis";
  cashflowCurve: Array<{ date: string; amount: number }>;
  riskFactors: string[];
  opportunityFactors: string[];
  summary: string;
}

export interface CareerProjection {
  currentPhase: "exploration" | "building" | "optimization" | "transition";
  trajectory: "accelerating" | "stable" | "declining" | "pivoting";
  keyMilestones: Array<{
    date: string;
    description: string;
    importance: number;
  }>;
  skillsToDevelop: string[];
  opportunities: string[];
  risks: string[];
}

export interface StrategicPriority {
  id: string;
  title: string;
  description: string;
  domain: "work" | "relationships" | "finance" | "life" | "strategy";
  importance: number; // 0-100
  urgency: number; // 0-100
  progress: number; // 0-1
  nextSteps: string[];
}

export interface StrategyOpportunity {
  id: string;
  title: string;
  description: string;
  domain: string;
  priority: "low" | "medium" | "high";
  timeWindow: {
    start: string;
    end: string;
  };
  suggestedActions: string[];
  potentialImpact: string;
}

export interface StrategyRisk {
  id: string;
  title: string;
  description: string;
  domain: string;
  severity: "low" | "medium" | "high";
  timeWindow: {
    start: string;
    end: string;
  };
  mitigation: string[];
  potentialImpact: string;
}

export interface DailyLever {
  id: string;
  title: string;
  description: string;
  domain: string;
  impact: "low" | "medium" | "high";
  controllability: "low" | "medium" | "high";
  action: string;
}

