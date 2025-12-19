// Adaptive Interface Composer - Experience Ω
// lib/zero-friction/adaptive-interface.ts

import { CognitiveProfile } from "./cognitive-profile";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";

export interface AdaptiveInterfaceConfig {
  showComplexFeatures: boolean;
  voiceFirstMode: boolean;
  showAdvancedDashboards: boolean;
  addNudges: boolean;
  simplifyLayouts: boolean;
  reduceVisualNoise: boolean;
  softenColors: boolean;
  slowAnimations: boolean;
  calmerTone: boolean;
  showMicroExplainers: boolean;
  informationDensity: "low" | "medium" | "high";
  componentVisibility: Record<string, boolean>;
}

/**
 * Compose adaptive interface based on cognitive profile
 */
export async function composeAdaptiveInterface(
  userId: string,
  profile: CognitiveProfile
): Promise<AdaptiveInterfaceConfig> {
  // Get current emotional state
  const ctx = await getWorkCortexContextForUser(userId);
  const emotion = ctx.emotion?.detected_emotion || "neutral";
  const stress = ctx.emotion?.intensity || 0.5;

  const config: AdaptiveInterfaceConfig = {
    showComplexFeatures: false,
    voiceFirstMode: false,
    showAdvancedDashboards: false,
    addNudges: false,
    simplifyLayouts: false,
    reduceVisualNoise: false,
    softenColors: false,
    slowAnimations: false,
    calmerTone: false,
    showMicroExplainers: false,
    informationDensity: profile.informationDensity,
    componentVisibility: {},
  };

  // Apply cognitive profile rules

  // Modality bias
  if (profile.modalityBias === "voice") {
    config.voiceFirstMode = true;
  }

  // Information density
  if (profile.informationDensity === "low") {
    config.showComplexFeatures = false;
    config.simplifyLayouts = true;
    config.reduceVisualNoise = true;
  } else if (profile.informationDensity === "high") {
    config.showComplexFeatures = true;
    config.showAdvancedDashboards = true;
  }

  // Execution style
  if (profile.executionStyle === "avoidance-prone" || profile.executionStyle === "exploratory") {
    config.addNudges = true;
    config.showMicroExplainers = true;
  }

  // Interaction speed
  if (profile.interactionSpeed === "slow") {
    config.slowAnimations = true;
    config.showMicroExplainers = true;
  }

  // Emotional sensitivity
  if (profile.emotionalSensitivity === "high" || stress > 0.7) {
    config.softenColors = true;
    config.slowAnimations = true;
    config.calmerTone = true;
    config.simplifyLayouts = true;
  }

  // Decision mode
  if (profile.decisionMode === "emotion") {
    config.calmerTone = true;
    config.softenColors = true;
  }

  // Component visibility based on profile
  config.componentVisibility = {
    butlerPanel: true,
    quantumNav: profile.informationDensity !== "low",
    strategyBoard: profile.informationDensity === "high",
    cortexTrace: profile.informationDensity === "high",
    advancedSettings: profile.informationDensity === "high",
  };

  return config;
}



