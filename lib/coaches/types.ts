// Coach Engine v2 + Roleplay Engine v2 Types
// lib/coaches/types.ts

// v2.5: Difficulty levels
export type CoachDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// v2.5: Coach tone preferences
export type CoachTone =
  | 'supportive'
  | 'direct'
  | 'drill_sergeant'
  | 'calm';

// v2.5: Difficulty preference (auto or fixed)
export type CoachDifficultyPref = 'auto' | CoachDifficulty;

// v2.5: User preferences per coach type
export interface CoachUserPreferences {
  coachType: string;
  tone: CoachTone;
  difficultyPref: CoachDifficultyPref;
}

// v2.5: Scenario from library
export interface CoachScenario {
  id: string;
  coachType: string; // 'sales', 'loan', 'negotiation', etc.
  title: string;
  description?: string;
  difficulty: CoachDifficulty;
  topicTags: string[];
  customerProfile?: Record<string, any>;
  constraints?: Record<string, any>;
  initialPrompt?: string;
}

// v2.5: Structured feedback v2
export interface CoachFeedbackV2 {
  whatWentWell: string[];
  whatToImprove: string[];
  suggestedDrills: string[];
  confidenceScore: number; // 0-100
}

// High-level context the coach sees
export type CoachContextPack = {
  userProfile: {
    id: string;
    name: string | null;
    role: string | null;          // job title
    company: string | null;
    jobModelId: string | null;    // from JOB_MODEL DB if exists
  };
  learningHistory: {
    completedLessons: Array<{
      id: string;
      title: string;
      completedAt: string;
      tags: string[];
      keyTakeaways?: string;
    }>;
    activeTracks: string[];       // e.g. ['Stoic Path', 'Strategic Selling']
    lastSessions: Array<{
      id: string;
      createdAt: string;
      scenarioType: string;
      skillNodes: string[];
      successRating: number | null;
      keyTakeaways?: string;
    }>;
  };
  thirdBrainInsights: {
    currentChapters: string[];    // "Q4 Auto Sales Push"
    keyTrends: string[];          // "Higher close rate when you pre-frame price"
  };
  activeScenario?: {
    scenarioType: string;
    summary: string;
    dealId?: string;
    contactId?: string;
  };
  // v2.5: Added fields
  difficultyLevel?: CoachDifficulty;
  preferences?: CoachUserPreferences;
  recentPerformanceSummary?: {
    averageScore: number;
    lastScore?: number;
    sessionsCount: number;
  };
};

// Structured scenario for roleplay
export type RoleplayScenario = {
  context: "auto_sales" | string;
  customerProfile: {
    name: string;
    budget: number;
    hardLimit: number;
    creditScore?: number;
    priorities: string[];      // ['monthly payment', 'reliable for 5+ years']
  };
  vehicle?: {
    model: string;
    dealerCost: number;
    listPrice: number;
    promoOptions: string[];    // ['0.9% for 36 months', '$1,000 rebate OR 0.9% APR']
  };
  objective: string;           // "Practice handling price objection realistically"
  constraints: {
    customerMustBeRational: boolean;
    acknowledgeValidMath: boolean;
    canWalkAwayIfPushedTooHard: boolean;
    shouldMoveTowardResolutionIfValueIsShown: boolean;
    difficulty: "easy" | "normal" | "hard";
  };
};

// One message in a roleplay transcript
export type RoleplayMessage = {
  role: "user" | "coach" | "customer" | "system";
  content: string;
  timestamp?: string;
};

