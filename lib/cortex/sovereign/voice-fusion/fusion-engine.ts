// Voice Persona Fusion Engine
// lib/cortex/sovereign/voice-fusion/fusion-engine.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { PersonaBlend, FusionContext } from "./types";
import { VoicePersonaKey } from "@/lib/voice/autonomy/types";
import { getBehaviorProfile } from "../sovereign-intelligence/profile-store";
import { scanIdentity } from "@/lib/identity/v3";
import { deriveUserInterventionPreferences } from "../meta-learning/preference-learner";

/**
 * Compute persona blend for given context
 */
export async function computePersonaBlend(
  userId: string,
  ctx: PulseCortexContext,
  baseCoachKey?: string
): Promise<PersonaBlend> {
  // Build fusion context
  const identityProfile = await scanIdentity(userId, ctx);
  const behaviorProfile = await getBehaviorProfile(userId);
  const userPreferences = await deriveUserInterventionPreferences(userId);

  const fusionContext: FusionContext = {
    emotion: {
      detected: ctx.emotion?.detected_emotion || "neutral",
      intensity: ctx.emotion?.intensity || 0.5,
    },
    identityArchetype: identityProfile.currentArchetype,
    domain: determineDomain(ctx),
    behaviorProfile: {
      pushIntensity: behaviorProfile.pushIntensity,
      guidanceStyle: behaviorProfile.guidanceStyle,
    },
    userPreferences: {
      personaTonePreferences: userPreferences.personaTonePreferences,
    },
  };

  // Determine primary and secondary personas
  const { primary, secondary } = selectPersonas(fusionContext, baseCoachKey);

  // Calculate weights
  const weights = calculateWeights(fusionContext, primary, secondary);

  // Calculate tone adjustments
  const toneAdjustments = calculateToneAdjustments(fusionContext);

  // Calculate style hints
  const styleHints = calculateStyleHints(fusionContext);

  return {
    primaryCoachKey: primary,
    secondaryCoachKey: secondary,
    weightPrimary: weights.primary,
    weightSecondary: weights.secondary,
    toneAdjustments,
    styleHints,
  };
}

/**
 * Determine domain from context
 */
function determineDomain(ctx: PulseCortexContext): FusionContext["domain"] {
  // Check which domain has most activity
  const workQueue = ctx.domains.work?.queue || [];
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const finance = ctx.domains.finance;
  const arcs = ctx.domains.strategy?.arcs || [];

  if (arcs.length > 0) return "strategy";
  if (workQueue.length > 10) return "work";
  if (relationships.length > 5) return "relationships";
  if (finance) return "finance";
  return "life";
}

/**
 * Select primary and secondary personas
 */
function selectPersonas(
  context: FusionContext,
  baseCoachKey?: string
): { primary: string; secondary?: string } {
  // If base coach key provided, use it as primary
  if (baseCoachKey) {
    return { primary: baseCoachKey };
  }

  // Map identity archetype to persona
  const archetypePersonaMap: Record<string, string> = {
    warrior: "command",
    strategist: "strategic",
    creator: "hype",
    builder: "command",
    stoic: "calm",
    leader: "warm_advisor",
    sage: "strategic",
  };

  const primary = archetypePersonaMap[context.identityArchetype] || "warm_advisor";

  // Select secondary based on emotion and domain
  let secondary: string | undefined;

  if (context.emotion.detected === "stressed" || context.emotion.detected === "overwhelmed") {
    secondary = "calm";
  } else if (context.emotion.detected === "motivated" || context.emotion.detected === "excited") {
    secondary = "hype";
  } else if (context.domain === "relationships") {
    secondary = "warm_advisor";
  } else if (context.domain === "work") {
    secondary = "strategic";
  }

  // Check user preferences
  if (context.userPreferences?.personaTonePreferences) {
    const topPreference = Object.entries(context.userPreferences.personaTonePreferences)
      .sort((a, b) => b[1] - a[1])[0];
    if (topPreference && topPreference[1] > 0.7) {
      secondary = topPreference[0];
    }
  }

  return { primary, secondary };
}

/**
 * Calculate persona weights
 */
function calculateWeights(
  context: FusionContext,
  primary: string,
  secondary?: string
): { primary: number; secondary: number } {
  if (!secondary) {
    return { primary: 1.0, secondary: 0 };
  }

  // Base weights
  let primaryWeight = 0.7;
  let secondaryWeight = 0.3;

  // Adjust based on emotion intensity
  if (context.emotion.intensity > 0.7) {
    // High emotion = more secondary influence
    primaryWeight = 0.6;
    secondaryWeight = 0.4;
  }

  // Adjust based on guidance style
  if (context.behaviorProfile.guidanceStyle === "reflective") {
    // Reflective style = more balanced blend
    primaryWeight = 0.6;
    secondaryWeight = 0.4;
  }

  // Adjust based on user preferences
  if (context.userPreferences?.personaTonePreferences) {
    const primaryPref = context.userPreferences.personaTonePreferences[primary] || 0.5;
    const secondaryPref = context.userPreferences.personaTonePreferences[secondary] || 0.5;

    if (secondaryPref > primaryPref) {
      // User prefers secondary, increase its weight
      primaryWeight = 0.6;
      secondaryWeight = 0.4;
    }
  }

  return { primary: primaryWeight, secondary: secondaryWeight };
}

/**
 * Calculate tone adjustments
 */
function calculateToneAdjustments(context: FusionContext): PersonaBlend["toneAdjustments"] {
  const adjustments: PersonaBlend["toneAdjustments"] = {};

  // Warmth based on emotion and domain
  if (context.domain === "relationships") {
    adjustments.warmth = 0.8;
  } else if (context.emotion.detected === "stressed") {
    adjustments.warmth = 0.7;
  } else {
    adjustments.warmth = 0.5;
  }

  // Directness based on push intensity and guidance style
  if (context.behaviorProfile.pushIntensity === "assertive") {
    adjustments.directness = 0.9;
  } else if (context.behaviorProfile.guidanceStyle === "directive") {
    adjustments.directness = 0.8;
  } else if (context.behaviorProfile.guidanceStyle === "reflective") {
    adjustments.directness = 0.3;
  } else {
    adjustments.directness = 0.5;
  }

  // Energy based on emotion
  if (context.emotion.detected === "motivated" || context.emotion.detected === "excited") {
    adjustments.energy = 0.9;
  } else if (context.emotion.detected === "stressed" || context.emotion.detected === "tired") {
    adjustments.energy = 0.3;
  } else {
    adjustments.energy = 0.6;
  }

  // Humor based on domain and emotion
  if (context.domain === "life" && context.emotion.intensity < 0.5) {
    adjustments.humor = 0.6;
  } else {
    adjustments.humor = 0.3;
  }

  return adjustments;
}

/**
 * Calculate style hints
 */
function calculateStyleHints(context: FusionContext): PersonaBlend["styleHints"] {
  // Sentence length based on guidance style
  let sentenceLength: "short" | "medium" | "long" = "medium";
  if (context.behaviorProfile.guidanceStyle === "directive") {
    sentenceLength = "short";
  } else if (context.behaviorProfile.guidanceStyle === "reflective") {
    sentenceLength = "long";
  }

  // Formality based on domain
  let formality: "casual" | "balanced" | "formal" = "balanced";
  if (context.domain === "work" || context.domain === "finance") {
    formality = "formal";
  } else if (context.domain === "life") {
    formality = "casual";
  }

  // Metaphor usage based on identity
  let metaphorUsage: "low" | "medium" | "high" = "medium";
  if (context.identityArchetype === "sage" || context.identityArchetype === "strategist") {
    metaphorUsage = "high";
  } else if (context.identityArchetype === "warrior" || context.identityArchetype === "builder") {
    metaphorUsage = "low";
  }

  return {
    sentenceLength,
    formality,
    metaphorUsage,
  };
}



