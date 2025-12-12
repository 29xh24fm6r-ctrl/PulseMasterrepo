// Coach Council Orchestrator Types
// lib/council/types.ts

export type CouncilMode =
  | "advisory"          // big decisions, life choices
  | "emotional_support" // high stress, overwhelm, relational pain
  | "performance"       // sales, output, discipline, execution
  | "life_navigation"   // long-term planning, identity + career + finance
  | "crisis";           // emotional crisis (non-self-harm)

export interface CouncilTriggerContext {
  userId?: string;
  primaryCoachId: string;
  userInput: string;
  emotionState?: string;        // from Emotion OS
  stressScore?: number;         // 0–1
  careerLevel?: string;         // from Career Engine
  identityFlags?: string[];     // from Identity Engine
}

export interface CouncilTriggerResult {
  useCouncil: boolean;
  mode?: CouncilMode;
  reason?: string;
}

export interface CouncilMember {
  coachId: string;
  role: "primary" | "secondary" | "observer";
  weight: number;           // 0–2
}

export interface CouncilAnalysis {
  coachId: string;
  personaId?: string;
  analysis: string;           // narrative analysis text
  keyConcerns: string[];      // bullets: "burnout", "identity conflict"
  recommendedSteps: string[]; // coach's action list
  risks: string[];            // what could go wrong
}

export interface CouncilSynthesisInput {
  mode: CouncilMode;
  userInput: string;
  analyses: CouncilAnalysis[];
  userModel?: any;
}

export interface CouncilSynthesis {
  final_answer: string;
  by_coach: Array<{
    coach_id: string;
    short_role: string;
    focus: string[];
    key_contribution: string;
  }>;
}




