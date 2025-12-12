// Persona Engine v2 Types
// lib/personas/types.ts

export interface ToneMatrix {
  energy: number; // 0-100
  warmth: number; // 0-100
  pacing: "fast" | "normal" | "slow";
  sentence_length: "short" | "medium" | "long";
  decisiveness: number; // 0-100
  humor: number; // 0-100
  metaphor_density: number; // 0-100
  rhetorical_intensity: number; // 0-100
  directiveness: number; // 0-100
  emotional_reflection: number; // 0-100
  phrasing_patterns: string[];
}

export interface StageConfig {
  base?: Partial<ToneMatrix>;
  apprentice?: Partial<ToneMatrix>;
  mastery?: Partial<ToneMatrix>;
  legend?: Partial<ToneMatrix>;
}

export interface PersonaProfile {
  id: string;
  key: string;
  name: string;
  description: string;
  style: ToneMatrix;
  stage_configs?: StageConfig;
  metadata?: Record<string, any>;
  is_generated?: boolean;
}

export interface FusionInput {
  personaA: PersonaProfile;
  personaB: PersonaProfile;
  weightA: number; // 0-100
  weightB: number; // 0-100
}

export interface FusionResult {
  name: string;
  style: ToneMatrix;
  fusionWeights: { a: number; b: number };
}

export type EvolutionStage = "base" | "apprentice" | "mastery" | "legend";

export interface EvolutionContext {
  xpRank?: number;
  careerLevel?: string;
  philosophyProgress?: number;
  emotionalStability?: number;
  journalingStreak?: number;
}

export interface ContextRule {
  triggerType: "emotion" | "time" | "kpi" | "mission" | "calendar" | "stress";
  triggerValue: string;
  coachId?: string;
  personaId: string;
  priority: number;
}

export interface PersonaDrift {
  adjustments: Partial<ToneMatrix>;
  decayRate: number; // per hour
  appliedAt: Date;
}

export interface RoleplayMask {
  id: string;
  name: string;
  description: string;
  style: ToneMatrix;
  difficulty: number;
  metadata: {
    emotional_anchors?: string[];
    reactivity_profile?: Record<string, number>;
    conflict_patterns?: string[];
    resolution_threshold?: number;
  };
}




