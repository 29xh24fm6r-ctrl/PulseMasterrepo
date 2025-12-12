// Identity Engine v3 Types
// lib/identity/v3/types.ts

import { MicroStep } from "@/lib/cortex/executive";

export type IdentityArchetype =
  | "warrior"
  | "strategist"
  | "creator"
  | "builder"
  | "stoic"
  | "leader"
  | "sage"
  | "explorer"
  | "guardian"
  | "visionary";

export type LifeSeason = "spring" | "summer" | "autumn" | "winter" | "transition";

export interface IdentityProfile {
  currentArchetype: IdentityArchetype;
  secondaryArchetypes: IdentityArchetype[];
  strengths: string[];
  blindspots: string[];
  behavioralPatterns: string[];
  growthEdges: string[];
  seasonalMode: LifeSeason;
  transformationArc?: {
    from: IdentityArchetype;
    to: IdentityArchetype;
    progress: number; // 0-1
  };
  shadowPatterns?: string[];
  identityTension?: {
    type: string;
    description: string;
    intensity: number; // 0-1
  };
}

export interface IdentityArcPlan {
  archetype: IdentityArchetype;
  duration: number; // days
  dailyPractices: MicroStep[];
  weeklyPractices: MicroStep[];
  narrativeShift: string;
  challenges: MicroStep[];
  milestones: Array<{
    day: number;
    description: string;
    microStep: MicroStep;
  }>;
  metadata?: Record<string, any>;
}

export interface IdentityInsight {
  type: "archetype_detection" | "pattern_shift" | "tension_detected" | "growth_edge";
  description: string;
  confidence: number; // 0-1
  evidence: string[];
  recommendation?: string;
}



