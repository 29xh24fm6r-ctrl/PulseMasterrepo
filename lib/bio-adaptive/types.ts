// Bio-Adaptive UI Types
// lib/bio-adaptive/types.ts

import { PhysiologyState } from "@/lib/physiology/types";

export interface BioAdaptiveUIState {
  // UI adjustments based on physiology
  colorScheme: "calm" | "normal" | "energized" | "stressed";
  contrast: "low" | "medium" | "high";
  density: "minimal" | "reduced" | "normal" | "high";
  motionSpeed: "slow" | "normal" | "fast";
  complexity: "simple" | "moderate" | "complex";
  butlerTone: "empathetic" | "supportive" | "neutral" | "energetic" | "directive";
  informationDensity: "low" | "medium" | "high";
}

export interface BioAdaptiveAdjustment {
  trigger: string; // What physiology state triggered this
  adjustment: Partial<BioAdaptiveUIState>;
  reason: string;
  confidence: number;
}



