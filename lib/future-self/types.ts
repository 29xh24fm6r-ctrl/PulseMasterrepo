// Future Self Model Types
// lib/future-self/types.ts

export interface FutureSelfPrediction {
  userId: string;
  generatedAt: string;
  horizon: number; // days

  // Identity trajectory
  identityTrajectory: {
    currentArchetype: string;
    projectedArchetype: string;
    transitionProbability: number; // 0-1
    transitionDate?: string;
    supportingFactors: string[];
    blockingFactors: string[];
  };

  // Habit drift
  habitDrift: Array<{
    habitId: string;
    habitName: string;
    currentStrength: number; // 0-1
    projectedStrength: number; // 0-1
    driftRate: number; // per day
    decayDate?: string; // When habit will break
    recoveryProbability: number; // 0-1
  }>;

  // Relationship decay windows
  relationshipDecay: Array<{
    personId: string;
    personName: string;
    currentState: "active" | "cooling" | "neglected";
    projectedState: "active" | "cooling" | "neglected" | "lost";
    decayWindow: {
      start: string;
      end: string;
    };
    preventDecayActions: string[];
  }>;

  // Burnout probability
  burnoutProbability: {
    current: number; // 0-1
    projected: number; // 0-1
    trajectory: Array<{
      date: string;
      probability: number;
    }>;
    riskFactors: string[];
    mitigationStrategies: string[];
  };

  // Motivation decay
  motivationDecay: {
    current: number; // 0-1
    projected: number; // 0-1
    decayRate: number; // per day
    recoveryTriggers: string[];
  };

  // Goal likelihood
  goalLikelihood: Array<{
    goalId: string;
    goalTitle: string;
    currentProgress: number; // 0-1
    likelihood: number; // 0-1
    blockers: string[];
    accelerators: string[];
    projectedCompletion?: string;
  }>;

  // Future opportunity windows
  opportunityWindows: Array<{
    id: string;
    title: string;
    description: string;
    window: {
      start: string;
      end: string;
    };
    probability: number; // 0-1
    requiredActions: string[];
    potentialImpact: "low" | "medium" | "high";
  }>;
}



