// Infinite Philosophy Training Engine - Core Types

export type PhilosophyId =
  | "stoicism"
  | "samurai"
  | "taoism"
  | "zen"
  | "seven_habits"
  | "discipline"
  | "spartan"
  | "buddhism"
  | "custom";

export type BeltRank =
  | "white"
  | "yellow"
  | "orange"
  | "green"
  | "blue"
  | "brown"
  | "black"
  | "master";

export type TrainingStyle =
  | "micro"
  | "scenario"
  | "drill"
  | "roleplay"
  | "challenge"
  | "boss"
  | "meditation"
  | "reflection";

export type MentorId =
  | "marcus_aurelius"
  | "seneca"
  | "epictetus"
  | "musashi"
  | "sun_tzu"
  | "lao_tzu"
  | "zen_master"
  | "buddha"
  | "covey"
  | "goggins"
  | "custom";

export type FactionId =
  | "stoic_order"
  | "samurai_brotherhood"
  | "taoist_garden"
  | "zen_circle"
  | "discipline_legion"
  | "spartan_agoge"
  | "custom";

// Belt progression thresholds
export const BELT_XP_THRESHOLDS: Record<BeltRank, number> = {
  white: 0,
  yellow: 500,
  orange: 1500,
  green: 3500,
  blue: 7000,
  brown: 12000,
  black: 20000,
  master: 50000,
};

export const BELT_COLORS: Record<BeltRank, string> = {
  white: "#f4f4f5",
  yellow: "#fbbf24",
  orange: "#f97316",
  green: "#22c55e",
  blue: "#3b82f6",
  brown: "#92400e",
  black: "#18181b",
  master: "#a855f7",
};

// Philosophy Path Definition
export interface PhilosophyPath {
  id: PhilosophyId;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultFaction: FactionId;
  coreVirtues: string[];
  keyPrinciples: string[];
}

// Skill Node for Skill Trees
export interface SkillNode {
  id: string;
  philosophy: PhilosophyId;
  name: string;
  description: string;
  beltRequired: BeltRank;
  xpRequired: number;
  parents: string[];
  tags: string[];
  icon: string;
  maxLevel: number;
}

// Mentor Profile
export interface MentorProfile {
  id: MentorId;
  name: string;
  philosophy: PhilosophyId | "mixed";
  styleTags: string[];
  description: string;
  toneDescription: string;
  examplePhrases: string[];
  icon: string;
}

// Faction Profile
export interface FactionProfile {
  id: FactionId;
  name: string;
  motto: string;
  philosophy: PhilosophyId | "mixed";
  description: string;
  perks: string[];
  icon: string;
  color: string;
}

// Training Request
export interface TrainingRequest {
  philosophy: PhilosophyId;
  belt: BeltRank;
  style: TrainingStyle | "auto";
  mentorId?: MentorId;
  factionId?: FactionId;
  crossPhilosophyWith?: PhilosophyId;
  focusTags?: string[];
  userProfile?: {
    socialConfidence: 1 | 2 | 3 | 4 | 5;
    anxietyLevel: 1 | 2 | 3 | 4 | 5;
    prefersShortTurns: boolean;
    wantsSoftTraining: boolean;
  };
}

// Training Unit (Generated Exercise)
export interface TrainingUnit {
  id: string;
  title: string;
  philosophy: PhilosophyId;
  crossPhilosophy?: PhilosophyId;
  style: TrainingStyle;
  difficulty: 1 | 2 | 3 | 4 | 5;
  beltLevel: BeltRank;
  instructions: string;
  promptForUser: string;
  mentorGuidance?: string;
  optionalRoleplayConfig?: {
    useRoleplayCoach: boolean;
    suggestedContextType: string;
    suggestedRelationshipType?: string;
    scenario?: string;
  };
  suggestedXpReward: number;
  suggestedIxp?: number;
  suggestedPxp?: number;
  suggestedMxp?: number;
  tags: string[];
  skillNodeIds?: string[];
  supportsMultiplayer?: boolean;
  multiplayerModeHint?: "ghost" | "asynchronous" | "live";
  estimatedMinutes: number;
}

// Training Session (User's progress through training)
export interface TrainingSession {
  id: string;
  userId: string;
  trainingUnit: TrainingUnit;
  startedAt: string;
  completedAt?: string;
  userResponse?: string;
  evaluation?: {
    score: number;
    feedback: string;
    xpAwarded: number;
    skillProgress?: Record<string, number>;
  };
  mentorFeedback?: string;
}

// User Philosophy Progress
export interface PhilosophyProgress {
  philosophyId: PhilosophyId;
  totalXp: number;
  currentBelt: BeltRank;
  trainingSessions: number;
  skillLevels: Record<string, number>;
  factionId?: FactionId;
  preferredMentorId?: MentorId;
  lastTrainedAt?: string;
  streakDays: number;
}

// Training Blueprint (internal structure before LLM expansion)
export interface TrainingBlueprint {
  philosophy: PhilosophyId;
  crossPhilosophy?: PhilosophyId;
  style: TrainingStyle;
  difficulty: number;
  belt: BeltRank;
  theme: string;
  tags: string[];
  titleHint: string;
  instructionsSkeleton: string;
  promptSkeleton: string;
  xpBase: number;
  xpCategory: "IXP" | "PXP" | "MXP" | "DXP";
}

// XP Award for Philosophy
export interface PhilosophyXPAward {
  philosophy: PhilosophyId;
  xp: number;
  category: "IXP" | "PXP" | "DXP" | "MXP";
  activity: string;
  skillNodeId?: string;
  trainingSessionId?: string;
  identityTags?: string[];
}
