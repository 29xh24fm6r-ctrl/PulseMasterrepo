// Pulse Motivational Coach - Core Types

// What type of motivation the user needs
export type MotivationalNeed =
  | "discipline"
  | "courage"
  | "self-belief"
  | "calm"
  | "clarity"
  | "self-forgiveness"
  | "resilience"
  | "focus"
  | "anti-procrastination"
  | "purpose"
  | "confidence"
  | "tactical-strategy"
  | "persistence"
  | "energy"
  | "wisdom"
  | "patience"
  | "action"
  | "mindfulness"
  | "leadership"
  | "creativity"
  | "mastery"
  | "ambition";

// High-level emotional state
export type EmotionalState =
  | "low"
  | "stressed"
  | "anxious"
  | "angry"
  | "tired"
  | "flat"
  | "overwhelmed"
  | "fine"
  | "amped"
  | "defeated"
  | "confused"
  | "scared"
  | "hopeless";

// Persona archetype category
export type PersonaArchetype =
  | "military"
  | "industry"
  | "modern_motivator"
  | "spiritual"
  | "psychology"
  | "sports"
  | "philosophy"
  | "oratory"
  | "faith"
  | "warrior"
  | "creative";

// Persona profile used by Pulse GPT Kernel
export interface PulsePersona {
  id: string;
  displayName: string;
  archetype: PersonaArchetype;
  primaryNeeds: MotivationalNeed[];
  secondaryNeeds: MotivationalNeed[];
  defaultIntensity: "low" | "medium" | "high";
  toneDescription: string;
  styleGuidelines: string[];
  typicalSessionLengthSec: [number, number];
  examplePhrases: string[];
}

// Snapshot of user motivational state at request time
export interface UserMotivationalState {
  emotion: EmotionalState;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  urgency: "low" | "medium" | "high";
  needs: MotivationalNeed[];
  prefersGentle: boolean;
  identityPath: string;
  recentPatterns: string[];
}

// Routing decision made by the coach
export interface RoutingDecision {
  personas: PulsePersona[];
  intensity: "low" | "medium" | "high";
}

// Persona effectiveness tracking
export type PersonaEffectivenessMap = Record<string, number>;

// Motivation event log for Second Brain
export interface MotivationEvent {
  id: string;
  timestamp: string;
  userId: string;
  detectedState: UserMotivationalState;
  selectedPersonas: string[];
  intensity: "low" | "medium" | "high";
  channel: "voice" | "text" | "proactive";
  contentSummary: string;
  microAction: string;
  userImmediateFeedback?: "better" | "same" | "worse" | null;
  userFollowThrough?: boolean;
  followUpNotes?: string;
  effectivenessScore?: number;
}

// API Request/Response types
export interface MotivationRequest {
  rawText: string;
  context?: {
    source?: "voice" | "text";
    identityPath?: string;
    recentPatterns?: string[];
    prefersGentle?: boolean;
  };
}

export interface MotivationResponse {
  personas: string[];
  intensity: "low" | "medium" | "high";
  message: string;
  microAction: string;
  voiceScript?: string;
  motivationEventId: string;
}

export interface ProactiveTriggerRequest {
  userId: string;
  triggerSource: string;
  rawContext: string;
  inferredStateOverride?: Partial<UserMotivationalState> | null;
}

export interface XPCallbackRequest {
  motivationEventId: string;
  actionTaken: boolean;
  userFeedback?: "better" | "same" | "worse";
}
