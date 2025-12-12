// Meta-Learning Layer v1 Types
// lib/cortex/sovereign/meta-learning/types.ts

export interface InterventionRecord {
  id: string;
  userId: string;
  timestamp: string;

  interventionType: string; // e.g., "relationship_nudge", "weekly_plan", "god_mode_plan"
  domain: string;
  contextSnapshot: any; // shallow summary from PulseCortexContext

  // Outcome metrics
  actedOn: boolean;
  timeToActionMinutes?: number;
  xpDelta?: number;
  moodDelta?: number;
  streakImpact?: number;

  userFeedback?: "positive" | "neutral" | "negative";
}

export interface UserPreferenceProfile {
  userId: string;
  updatedAt: string;

  // Intervention type preferences
  interventionSuccessRates: Record<string, number>; // interventionType -> success rate (0-1)

  // Domain preferences
  domainResponseProfiles: Record<
    string,
    {
      pushWorks: boolean; // Does assertive push work?
      gentleWorks: boolean; // Does gentle nudge work?
      bestTimeWindow: string; // e.g., "morning", "afternoon", "evening"
    }
  >;

  // Persona tone preferences
  personaTonePreferences: Record<string, number>; // personaKey -> preference score (0-1)

  // EF plan preferences
  planAggressiveness: number; // 0-1, how aggressive plans should be
  preferredPlanLength: number; // preferred number of micro-steps

  // Notification preferences
  nudgeFrequency: "low" | "medium" | "high";
  bestNudgeTimes: string[]; // Array of time windows

  // Meta insights
  keyLearnings: string[];
}



