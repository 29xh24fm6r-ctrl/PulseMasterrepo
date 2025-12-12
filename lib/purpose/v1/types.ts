// Life Mission & Purpose Engine v1 Types
// lib/purpose/v1/types.ts

import { IdentityArchetype } from "@/lib/identity/v3/types";

export interface MissionProfile {
  mission: string; // Core mission statement
  narrative: string; // Life narrative/story
  northStar: string; // Ultimate direction
  oneYearArc: MissionArc;
  ninetyDayArc: MissionArc;
  identityDrivers: string[]; // What drives identity choices
  shadowConflicts: string[]; // Internal conflicts blocking mission
  coreMotivations: string[]; // Deep motivations
  recurringThemes: string[]; // Patterns in life
  futurePathCandidates: string[]; // Possible future directions
}

export interface MissionArc {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  milestones: Array<{
    date: string;
    description: string;
    importance: number;
  }>;
  identityRoles: IdentityRole[];
  alignmentIndicators: string[];
  progress: number; // 0-1
}

export interface IdentityRole {
  archetype: IdentityArchetype;
  role: string; // e.g., "Strategic Leader", "Creative Builder"
  weight: number; // 0-1, how much this role matters
  practices: string[];
}

export interface MissionInsight {
  type: "theme" | "motivation" | "conflict" | "direction" | "alignment";
  description: string;
  confidence: number; // 0-1
  evidence: string[];
  recommendation?: string;
}



