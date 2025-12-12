// Safety & Boundary Engine Types
// lib/safety/types.ts

export type SafetyCategory =
  | "sexual"
  | "self_harm"
  | "suicide"
  | "violence"
  | "illegal_acts"
  | "hate_harassment"
  | "substances"
  | "medical_diagnosis"
  | "financial_advice_high_risk"
  | "gambling"
  | "other";

export type SafetyAction =
  | "block"          // do not answer, give safe redirect
  | "sanitize"       // strip/soften content, answer safely
  | "route_to_help"  // give supportive, non-directive response
  | "allow";

export interface SafetyRule {
  id: string;
  description: string;
  category: SafetyCategory;
  triggers: {
    input_patterns?: string[];   // regex / keywords
    output_patterns?: string[];
    flags?: string[];           // from model safety classifiers
  };
  action: SafetyAction;
  severity: 1 | 2 | 3 | 4 | 5;
  coach_scope?: string[];         // if null = global
}

export interface SafetyPolicyConfig {
  key: string;
  core_values: string[];
  hard_rules: SafetyRule[];
  soft_guidelines: string[];
}

export interface SafetyEvaluation {
  triggeredRules: SafetyRule[];
  highestSeverity: number;
  action?: SafetyAction;
}

export interface UserSafetySettings {
  id?: string;
  user_id: string;
  allow_mature_but_nonsexual: boolean;
  allow_direct_language: boolean;
  tone_sensitivity: "low" | "normal" | "high";
}




