// Sovereign Intelligence Mode v1 Types
// lib/cortex/sovereign/sovereign-intelligence/types.ts

export interface BehaviorProfile {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;

  // High-level "style" knobs
  pushIntensity: "gentle" | "balanced" | "assertive";
  autonomyLevel: "low" | "medium" | "high";
  guidanceStyle: "coaching" | "advisory" | "directive" | "reflective";
  planningGranularity: "coarse" | "balanced" | "fine";

  // Learned weights
  domainWeights: Record<string, number>; // work, relationships, finance, life, strategy
  riskTolerance: number; // 0-1
  changeSpeed: number; // 0-1 - how quickly Pulse adapts

  // Metadata
  version: number;
  lastUpdateReason?: string;
}

export interface BehaviorUpdate {
  field: keyof BehaviorProfile;
  oldValue: any;
  newValue: any;
  reason: string;
  confidence: number; // 0-1
  timestamp: string;
}

export interface SovereignUpdateContext {
  recentActions: Array<{
    action: string;
    accepted: boolean;
    timestamp: string;
  }>;
  xpOutcomes: {
    delta: number;
    domainBreakdown: Record<string, number>;
  };
  userFeedback: Array<{
    type: "positive" | "negative" | "neutral";
    context: string;
    timestamp: string;
  }>;
  emotionTrends: {
    averageIntensity: number;
    dominantEmotion: string;
    stressLevel: number;
  };
  streakData: {
    currentStreak: number;
    streakChanges: number;
  };
}



