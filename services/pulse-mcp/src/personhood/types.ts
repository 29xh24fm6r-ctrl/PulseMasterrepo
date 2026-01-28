// personhood/types.ts
// Shared types for the Conversational Personhood Layer.

export type Posture =
  | "calm_precise"
  | "curious_open"
  | "focused_minimal"
  | "collaborative_structured"
  | "neutral_brief";

export type FamiliarityLevel = 0 | 1 | 2 | 3;

export interface PostureContext {
  proposal_type?: string;
  signal_severity?: "none" | "low" | "medium" | "high" | "critical";
  autonomy_level: number;
  trust_score: number;
  recent_interaction_type?: string;
}

export interface ConversationContext {
  posture: Posture;
  familiarity: FamiliarityLevel;
  trust: { autonomy_level: number; trust_score: number };
  signal_count: number;
  trigger_count: number;
  preferences: TastePreferences;
}

export interface TastePreferences {
  density: "low" | "medium" | "high";
  question_rate: "minimal" | "normal" | "frequent";
  decisiveness: "cautious" | "balanced" | "decisive";
  verbosity: "terse" | "moderate" | "verbose";
}

export const DEFAULT_PREFERENCES: TastePreferences = {
  density: "medium",
  question_rate: "normal",
  decisiveness: "balanced",
  verbosity: "moderate",
};

export interface TasteSignal {
  signal_type: "explicit" | "implicit";
  dimension: keyof TastePreferences;
  direction: "increase" | "decrease";
  raw_feedback?: string;
}

export interface LintResult {
  passed: boolean;
  violations: string[];
  cleaned: string;
}

export interface ShapedOutput {
  text: string;
  posture: Posture;
  familiarity_level: FamiliarityLevel;
  lint_result: LintResult;
  question_count: number;
}
