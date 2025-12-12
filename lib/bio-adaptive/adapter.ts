// Bio-Adaptive UI Adapter
// lib/bio-adaptive/adapter.ts

import { PhysiologyState } from "@/lib/physiology/types";
import { BioAdaptiveUIState, BioAdaptiveAdjustment } from "./types";

/**
 * Generate bio-adaptive UI state from physiology
 */
export function adaptUIToPhysiology(
  physiology: PhysiologyState,
  currentUIState?: Partial<BioAdaptiveUIState>
): BioAdaptiveUIState {
  const adjustments: BioAdaptiveAdjustment[] = [];

  // Determine color scheme
  let colorScheme: BioAdaptiveUIState["colorScheme"] = "normal";
  if (physiology.stressScore > 0.7) {
    colorScheme = "stressed";
    adjustments.push({
      trigger: "high_stress",
      adjustment: { colorScheme: "stressed" },
      reason: "High stress detected - using calming colors",
      confidence: physiology.confidence,
    });
  } else if (physiology.readinessScore > 0.8 && physiology.stressScore < 0.4) {
    colorScheme = "energized";
    adjustments.push({
      trigger: "high_readiness",
      adjustment: { colorScheme: "energized" },
      reason: "High readiness - using energizing colors",
      confidence: physiology.confidence,
    });
  } else if (physiology.stressScore < 0.3) {
    colorScheme = "calm";
  }

  // Determine contrast
  let contrast: BioAdaptiveUIState["contrast"] = "medium";
  if (physiology.cognitiveLoadScore > 0.7) {
    contrast = "high";
    adjustments.push({
      trigger: "high_cognitive_load",
      adjustment: { contrast: "high" },
      reason: "High cognitive load - increasing contrast for clarity",
      confidence: physiology.confidence,
    });
  } else if (physiology.stressScore > 0.7) {
    contrast = "low";
    adjustments.push({
      trigger: "high_stress",
      adjustment: { contrast: "low" },
      reason: "High stress - reducing contrast for comfort",
      confidence: physiology.confidence,
    });
  }

  // Determine density
  let density: BioAdaptiveUIState["density"] = "normal";
  if (physiology.stressScore > 0.7 || physiology.cognitiveLoadScore > 0.8) {
    density = "reduced";
    adjustments.push({
      trigger: "overload",
      adjustment: { density: "reduced" },
      reason: "Cognitive overload - reducing information density",
      confidence: physiology.confidence,
    });
  } else if (physiology.readinessScore > 0.8 && physiology.stressScore < 0.4) {
    density = "high";
    adjustments.push({
      trigger: "high_readiness",
      adjustment: { density: "high" },
      reason: "High readiness - increasing information density",
      confidence: physiology.confidence,
    });
  } else if (physiology.stressScore < 0.2) {
    density = "minimal";
  }

  // Determine motion speed
  let motionSpeed: BioAdaptiveUIState["motionSpeed"] = "normal";
  if (physiology.stressScore > 0.7 || physiology.cognitiveLoadScore > 0.8) {
    motionSpeed = "slow";
    adjustments.push({
      trigger: "overload",
      adjustment: { motionSpeed: "slow" },
      reason: "Overload detected - slowing animations",
      confidence: physiology.confidence,
    });
  } else if (physiology.readinessScore > 0.8) {
    motionSpeed = "fast";
  }

  // Determine complexity
  let complexity: BioAdaptiveUIState["complexity"] = "moderate";
  if (physiology.stressScore > 0.7 || physiology.cognitiveLoadScore > 0.8) {
    complexity = "simple";
  } else if (physiology.readinessScore > 0.8) {
    complexity = "complex";
  }

  // Determine Butler tone
  let butlerTone: BioAdaptiveUIState["butlerTone"] = "neutral";
  if (physiology.stressScore > 0.7) {
    butlerTone = "empathetic";
    adjustments.push({
      trigger: "high_stress",
      adjustment: { butlerTone: "empathetic" },
      reason: "High stress - using empathetic butler tone",
      confidence: physiology.confidence,
    });
  } else if (physiology.burnoutIndex > 0.6) {
    butlerTone = "supportive";
  } else if (physiology.readinessScore > 0.8) {
    butlerTone = "energetic";
  } else if (physiology.cognitiveLoadScore > 0.7) {
    butlerTone = "directive";
  }

  // Determine information density
  let informationDensity: BioAdaptiveUIState["informationDensity"] = "medium";
  if (density === "reduced" || density === "minimal") {
    informationDensity = "low";
  } else if (density === "high") {
    informationDensity = "high";
  }

  return {
    colorScheme,
    contrast,
    density,
    motionSpeed,
    complexity,
    butlerTone,
    informationDensity,
  };
}

/**
 * Get CSS variables for bio-adaptive UI
 */
export function getBioAdaptiveCSS(state: BioAdaptiveUIState): Record<string, string> {
  const css: Record<string, string> = {};

  // Color scheme adjustments
  if (state.colorScheme === "stressed") {
    css["--ui-primary"] = "rgb(245, 158, 11)"; // Warm amber
    css["--ui-background"] = "rgb(20, 20, 24)"; // Softer background
  } else if (state.colorScheme === "energized") {
    css["--ui-primary"] = "rgb(6, 182, 212)"; // Electric cyan
    css["--ui-background"] = "rgb(9, 9, 11)"; // Deep background
  } else if (state.colorScheme === "calm") {
    css["--ui-primary"] = "rgb(148, 163, 184)"; // Muted blue-gray
    css["--ui-background"] = "rgb(18, 18, 20)"; // Soft background
  }

  // Contrast adjustments
  if (state.contrast === "low") {
    css["--ui-text-primary"] = "rgb(220, 220, 220)";
    css["--ui-border"] = "rgba(255, 255, 255, 0.05)";
  } else if (state.contrast === "high") {
    css["--ui-text-primary"] = "rgb(255, 255, 255)";
    css["--ui-border"] = "rgba(255, 255, 255, 0.3)";
  }

  // Motion speed
  css["--motion-duration"] =
    state.motionSpeed === "slow" ? "600ms" : state.motionSpeed === "fast" ? "200ms" : "300ms";

  return css;
}



