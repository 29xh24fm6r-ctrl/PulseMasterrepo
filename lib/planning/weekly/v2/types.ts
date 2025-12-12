// Autonomous Weekly Planning Engine v2 Types
// lib/planning/weekly/v2/types.ts

import { MicroStep } from "@/lib/cortex/executive";
import { DomainKey } from "@/lib/cortex/types";
import { TimeSliceBlock } from "@/lib/time-slicing/v1/types";

export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  bigThree: string[]; // High-level priorities
  identityObjectives: MicroStep[];
  domainObjectives: DomainObjective[];
  relationshipTouches: RelationshipAction[];
  financialCheckpoints: FinancialAction[];
  riskMitigations: MicroStep[];
  opportunityMoves: MicroStep[];
  timeBlocks: TimeSliceBlock[];
  dailyPlans: DailyPlan[];
  missionAlignment?: {
    alignmentScore: number; // 0-1
    alignmentTags: string[];
  };
  generatedAt: string;
}

export interface DomainObjective {
  domain: DomainKey;
  title: string;
  description?: string;
  microSteps: MicroStep[];
  estimatedMinutes: number;
  priority: number; // 0-100
}

export interface RelationshipAction {
  personId: string;
  personName: string;
  action: "reconnect" | "deepen" | "maintain" | "repair";
  suggestedMessage?: string;
  priority: number;
  dayOfWeek?: number; // 0-6, 0 = Sunday
}

export interface FinancialAction {
  type: "review" | "payment" | "investment" | "planning";
  title: string;
  description?: string;
  dueDate?: string;
  amount?: number;
  priority: number;
}

export interface DailyPlan {
  date: string;
  dayOfWeek: string;
  focus: string; // Main focus for the day
  timeBlocks: TimeSliceBlock[];
  tasks: MicroStep[];
  relationshipActions: RelationshipAction[];
  identityPractices: MicroStep[];
  energyProfile: {
    morning: "low" | "medium" | "high";
    afternoon: "low" | "medium" | "high";
    evening: "low" | "medium" | "high";
  };
}



