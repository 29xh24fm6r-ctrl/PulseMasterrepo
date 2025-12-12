// Persona Evolution Stages
// lib/personas/stages.ts

import { EvolutionStage, EvolutionContext, ToneMatrix } from "./types";

/**
 * Evaluate user's current evolution stage
 */
export function evaluateStage(context: EvolutionContext): EvolutionStage {
  let score = 0;

  // XP Rank contribution (0-30 points)
  if (context.xpRank) {
    if (context.xpRank >= 10000) score += 30;
    else if (context.xpRank >= 5000) score += 20;
    else if (context.xpRank >= 2000) score += 10;
  }

  // Career Level contribution (0-30 points)
  if (context.careerLevel) {
    const levelMap: Record<string, number> = {
      legend: 30,
      elite: 20,
      pro: 15,
      operator: 10,
      rookie: 0,
    };
    score += levelMap[context.careerLevel.toLowerCase()] || 0;
  }

  // Philosophy Progress contribution (0-20 points)
  if (context.philosophyProgress) {
    if (context.philosophyProgress >= 80) score += 20;
    else if (context.philosophyProgress >= 60) score += 15;
    else if (context.philosophyProgress >= 40) score += 10;
    else if (context.philosophyProgress >= 20) score += 5;
  }

  // Emotional Stability contribution (0-10 points)
  if (context.emotionalStability !== undefined) {
    if (context.emotionalStability >= 0.8) score += 10;
    else if (context.emotionalStability >= 0.6) score += 7;
    else if (context.emotionalStability >= 0.4) score += 4;
  }

  // Journaling Streak contribution (0-10 points)
  if (context.journalingStreak) {
    if (context.journalingStreak >= 30) score += 10;
    else if (context.journalingStreak >= 14) score += 7;
    else if (context.journalingStreak >= 7) score += 4;
  }

  // Determine stage
  if (score >= 80) return "legend";
  if (score >= 60) return "mastery";
  if (score >= 30) return "apprentice";
  return "base";
}

/**
 * Apply stage modifiers to base persona
 */
export function applyStageModifiers(
  baseStyle: ToneMatrix,
  stageConfig: Partial<ToneMatrix> | undefined
): ToneMatrix {
  if (!stageConfig) return baseStyle;

  const modified: ToneMatrix = { ...baseStyle };

  // Apply numeric adjustments
  if (stageConfig.energy !== undefined) {
    modified.energy = Math.max(0, Math.min(100, baseStyle.energy + stageConfig.energy));
  }
  if (stageConfig.warmth !== undefined) {
    modified.warmth = Math.max(0, Math.min(100, baseStyle.warmth + stageConfig.warmth));
  }
  if (stageConfig.decisiveness !== undefined) {
    modified.decisiveness = Math.max(0, Math.min(100, baseStyle.decisiveness + stageConfig.decisiveness));
  }
  if (stageConfig.humor !== undefined) {
    modified.humor = Math.max(0, Math.min(100, baseStyle.humor + stageConfig.humor));
  }
  if (stageConfig.metaphor_density !== undefined) {
    modified.metaphor_density = Math.max(0, Math.min(100, baseStyle.metaphor_density + stageConfig.metaphor_density));
  }
  if (stageConfig.rhetorical_intensity !== undefined) {
    modified.rhetorical_intensity = Math.max(0, Math.min(100, baseStyle.rhetorical_intensity + stageConfig.rhetorical_intensity));
  }
  if (stageConfig.directiveness !== undefined) {
    modified.directiveness = Math.max(0, Math.min(100, baseStyle.directiveness + stageConfig.directiveness));
  }
  if (stageConfig.emotional_reflection !== undefined) {
    modified.emotional_reflection = Math.max(0, Math.min(100, baseStyle.emotional_reflection + stageConfig.emotional_reflection));
  }

  // Apply string overrides
  if (stageConfig.pacing) modified.pacing = stageConfig.pacing;
  if (stageConfig.sentence_length) modified.sentence_length = stageConfig.sentence_length;

  // Merge phrasing patterns
  if (stageConfig.phrasing_patterns) {
    modified.phrasing_patterns = [
      ...baseStyle.phrasing_patterns,
      ...stageConfig.phrasing_patterns,
    ].slice(0, 10);
  }

  return modified;
}




