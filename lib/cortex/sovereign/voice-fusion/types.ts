// Voice Persona Fusion Engine v1 Types
// lib/cortex/sovereign/voice-fusion/types.ts

import { VoicePersonaKey } from "@/lib/voice/autonomy/types";

export interface PersonaBlend {
  primaryCoachKey: string;
  secondaryCoachKey?: string;
  weightPrimary: number; // 0-1
  weightSecondary: number; // 0-1
  toneAdjustments: {
    warmth?: number; // 0-1
    directness?: number; // 0-1
    energy?: number; // 0-1
    humor?: number; // 0-1
  };
  styleHints: {
    sentenceLength: "short" | "medium" | "long";
    formality: "casual" | "balanced" | "formal";
    metaphorUsage: "low" | "medium" | "high";
  };
}

export interface FusionContext {
  emotion: {
    detected: string;
    intensity: number;
  };
  identityArchetype: string;
  missionFocus?: string;
  domain: "work" | "relationships" | "finance" | "life" | "strategy";
  behaviorProfile: {
    pushIntensity: "gentle" | "balanced" | "assertive";
    guidanceStyle: "coaching" | "advisory" | "directive" | "reflective";
  };
  userPreferences?: {
    personaTonePreferences: Record<string, number>;
  };
}



