// Identity Scanner v3
// lib/identity/v3/identity-scanner.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PulseCortexContext } from "@/lib/cortex/types";
import {
  IdentityProfile,
  IdentityArchetype,
  IdentityInsight,
  LifeSeason,
} from "./types";

/**
 * Scan user data to build identity profile
 */
export async function scanIdentity(
  userId: string,
  ctx: PulseCortexContext
): Promise<IdentityProfile> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Analyze multiple data sources
  const [archetype, secondaryArchetypes] = await detectArchetypes(ctx, dbUserId);
  const strengths = await detectStrengths(ctx, dbUserId);
  const blindspots = await detectBlindspots(ctx, dbUserId);
  const behavioralPatterns = await detectBehavioralPatterns(ctx);
  const growthEdges = await detectGrowthEdges(ctx, strengths, blindspots);
  const seasonalMode = detectSeasonalMode(ctx);
  const transformationArc = detectTransformationArc(ctx, archetype);
  const shadowPatterns = await detectShadowPatterns(ctx, dbUserId);
  const identityTension = detectIdentityTension(ctx, archetype, secondaryArchetypes);

  return {
    currentArchetype: archetype,
    secondaryArchetypes,
    strengths,
    blindspots,
    behavioralPatterns,
    growthEdges,
    seasonalMode,
    transformationArc,
    shadowPatterns,
    identityTension,
  };
}

/**
 * Detect primary and secondary archetypes
 */
async function detectArchetypes(
  ctx: PulseCortexContext,
  dbUserId: string
): Promise<[IdentityArchetype, IdentityArchetype[]]> {
  const scores: Record<IdentityArchetype, number> = {
    warrior: 0,
    strategist: 0,
    creator: 0,
    builder: 0,
    stoic: 0,
    leader: 0,
    sage: 0,
    explorer: 0,
    guardian: 0,
    visionary: 0,
  };

  // Analyze XP distribution
  const xpBreakdown = ctx.xp.domainBreakdown || {};
  if (xpBreakdown.work && xpBreakdown.work > 100) scores.strategist += 0.3;
  if (xpBreakdown.relationships && xpBreakdown.relationships > 100) scores.leader += 0.3;
  if (xpBreakdown.life && xpBreakdown.life > 100) scores.sage += 0.2;

  // Analyze task patterns
  const workQueue = ctx.domains.work?.queue || [];
  const highPriorityCount = workQueue.filter((item) => item.priority === "high").length;
  if (highPriorityCount > 5) scores.warrior += 0.2;
  if (workQueue.length > 10) scores.builder += 0.2;

  // Analyze longitudinal patterns
  const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  if (productivityArcs.length > 0) scores.builder += 0.2;

  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  if (burnoutPatterns.length > 0) scores.stoic += 0.2;

  // Analyze emotion patterns
  if (ctx.emotion) {
    if (ctx.emotion.detected_emotion === "motivated" || ctx.emotion.detected_emotion === "excited") {
      scores.creator += 0.2;
    }
    if (ctx.emotion.detected_emotion === "calm" || ctx.emotion.detected_emotion === "peaceful") {
      scores.sage += 0.2;
    }
  }

  // Analyze relationship patterns
  const relationships = ctx.domains.relationships?.keyPeople || [];
  if (relationships.length > 10) scores.leader += 0.2;

  // Analyze strategy/arcs
  const arcs = ctx.domains.strategy?.arcs || [];
  if (arcs.length > 0) scores.visionary += 0.2;

  // Find top archetypes
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][0] as IdentityArchetype;
  const secondary = sorted.slice(1, 3).map(([arch]) => arch as IdentityArchetype);

  // Default to strategist if no clear pattern
  return primary && scores[primary] > 0.3
    ? [primary, secondary]
    : ["strategist", ["builder", "warrior"]];
}

/**
 * Detect strengths from patterns
 */
async function detectStrengths(
  ctx: PulseCortexContext,
  dbUserId: string
): Promise<string[]> {
  const strengths: string[] = [];

  // Consistency
  if (ctx.xp.streakDays > 7) strengths.push("consistency");

  // Productivity
  const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  if (productivityArcs.length > 0) strengths.push("productivity");

  // Relationship management
  const relationships = ctx.domains.relationships?.keyPeople || [];
  if (relationships.length > 5) strengths.push("relationship_building");

  // Strategic thinking
  const arcs = ctx.domains.strategy?.arcs || [];
  if (arcs.length > 0) strengths.push("strategic_thinking");

  // Emotional regulation
  if (ctx.emotion && ctx.emotion.detected_emotion === "calm") {
    strengths.push("emotional_regulation");
  }

  // Habit formation
  const habits = ctx.domains.life?.habits || [];
  const highCompletionHabits = habits.filter((h) => h.completionRate > 0.7);
  if (highCompletionHabits.length > 0) strengths.push("habit_formation");

  return strengths;
}

/**
 * Detect blindspots
 */
async function detectBlindspots(
  ctx: PulseCortexContext,
  dbUserId: string
): Promise<string[]> {
  const blindspots: string[] = [];

  // Procrastination
  const procrastinationPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "procrastination_cycle"
  );
  if (procrastinationPatterns.length > 0) blindspots.push("task_avoidance");

  // Relationship neglect
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const neglected = relationships.filter((p) => p.daysSinceInteraction > 30);
  if (neglected.length > 3) blindspots.push("relationship_neglect");

  // Financial awareness
  const finance = ctx.domains.finance;
  if (!finance || !finance.cashflowProjection) {
    blindspots.push("financial_awareness");
  }

  // Burnout risk
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  if (burnoutPatterns.length > 0) blindspots.push("burnout_prevention");

  // Emotional awareness
  if (!ctx.emotion || ctx.emotion.intensity < 0.3) {
    blindspots.push("emotional_awareness");
  }

  return blindspots;
}

/**
 * Detect behavioral patterns
 */
function detectBehavioralPatterns(ctx: PulseCortexContext): string[] {
  const patterns: string[] = [];

  // Work patterns
  const workQueue = ctx.domains.work?.queue || [];
  if (workQueue.length > 15) patterns.push("high_workload");
  if (workQueue.length < 5) patterns.push("low_workload");

  // Energy patterns
  const energy = ctx.cognitiveProfile.currentEnergyLevel;
  if (energy > 0.7) patterns.push("high_energy");
  if (energy < 0.4) patterns.push("low_energy");

  // Social patterns
  const relationships = ctx.domains.relationships?.keyPeople || [];
  if (relationships.length > 10) patterns.push("high_social_engagement");
  if (relationships.length < 3) patterns.push("low_social_engagement");

  // Habit patterns
  const habits = ctx.domains.life?.habits || [];
  if (habits.length > 5) patterns.push("habit_focused");

  return patterns;
}

/**
 * Detect growth edges
 */
function detectGrowthEdges(
  ctx: PulseCortexContext,
  strengths: string[],
  blindspots: string[]
): string[] {
  const edges: string[] = [];

  // Growth from blindspots
  if (blindspots.includes("task_avoidance")) {
    edges.push("develop_execution_discipline");
  }
  if (blindspots.includes("relationship_neglect")) {
    edges.push("deepen_relationships");
  }
  if (blindspots.includes("financial_awareness")) {
    edges.push("build_financial_intelligence");
  }

  // Growth from strengths
  if (strengths.includes("consistency")) {
    edges.push("scale_consistency_to_new_domains");
  }
  if (strengths.includes("productivity")) {
    edges.push("balance_productivity_with_rest");
  }

  return edges;
}

/**
 * Detect seasonal mode
 */
function detectSeasonalMode(ctx: PulseCortexContext): LifeSeason {
  const chapters = ctx.longitudinal.chapters;
  if (chapters.length === 0) return "summer";

  const currentChapter = chapters[chapters.length - 1];
  const isRecent = !currentChapter.end ||
    new Date(currentChapter.end).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;

  if (isRecent && !currentChapter.end) {
    return "transition";
  }

  // Use emotion to determine season
  if (ctx.emotion) {
    const emotion = ctx.emotion.detected_emotion;
    if (emotion === "motivated" || emotion === "excited") return "spring";
    if (emotion === "stressed" || emotion === "overwhelmed") return "winter";
    if (emotion === "calm" || emotion === "peaceful") return "autumn";
  }

  return "summer";
}

/**
 * Detect transformation arc
 */
function detectTransformationArc(
  ctx: PulseCortexContext,
  currentArchetype: IdentityArchetype
): IdentityProfile["transformationArc"] | undefined {
  const chapters = ctx.longitudinal.chapters;
  if (chapters.length < 2) return undefined;

  // Check if there's a pattern shift
  const recentChapters = chapters.slice(-3);
  const themes = recentChapters.flatMap((c) => c.majorThemes || []);

  // Simple heuristic: if themes are changing, transformation might be happening
  if (themes.length > 0) {
    const uniqueThemes = new Set(themes);
    if (uniqueThemes.size > 2) {
      // Potential transformation
      return {
        from: currentArchetype,
        to: currentArchetype, // Would need more sophisticated detection
        progress: 0.5, // Placeholder
      };
    }
  }

  return undefined;
}

/**
 * Detect shadow patterns
 */
async function detectShadowPatterns(
  ctx: PulseCortexContext,
  dbUserId: string
): Promise<string[]> {
  const shadows: string[] = [];

  // Avoidance patterns
  const procrastinationPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "procrastination_cycle"
  );
  if (procrastinationPatterns.length > 0) shadows.push("avoidance");

  // Conflict avoidance
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const negativeAssociations = relationships.filter(
    (p) => p.relationshipScore < 50 && p.daysSinceInteraction > 30
  );
  if (negativeAssociations.length > 0) shadows.push("conflict_avoidance");

  // Overwork
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  if (burnoutPatterns.length > 0) shadows.push("overwork");

  return shadows;
}

/**
 * Detect identity tension
 */
function detectIdentityTension(
  ctx: PulseCortexContext,
  primary: IdentityArchetype,
  secondary: IdentityArchetype[]
): IdentityProfile["identityTension"] | undefined {
  // Check for conflicting archetypes
  const conflictingPairs: Array<[IdentityArchetype, IdentityArchetype]> = [
    ["warrior", "stoic"],
    ["creator", "builder"],
    ["leader", "sage"],
  ];

  for (const [arch1, arch2] of conflictingPairs) {
    if (
      (primary === arch1 && secondary.includes(arch2)) ||
      (primary === arch2 && secondary.includes(arch1))
    ) {
      return {
        type: "archetype_conflict",
        description: `Tension between ${arch1} and ${arch2} archetypes`,
        intensity: 0.6,
      };
    }
  }

  // Check for emotional vs strategic tension
  if (primary === "warrior" && ctx.emotion?.detected_emotion === "calm") {
    return {
      type: "emotional_strategic_tension",
      description: "Warrior archetype with calm emotional state",
      intensity: 0.4,
    };
  }

  return undefined;
}

/**
 * Generate identity insights
 */
export async function generateIdentityInsights(
  profile: IdentityProfile,
  ctx: PulseCortexContext
): Promise<IdentityInsight[]> {
  const insights: IdentityInsight[] = [];

  // Archetype detection
  insights.push({
    type: "archetype_detection",
    description: `Primary archetype: ${profile.currentArchetype}`,
    confidence: 0.8,
    evidence: [
      `Secondary archetypes: ${profile.secondaryArchetypes.join(", ")}`,
      `Seasonal mode: ${profile.seasonalMode}`,
    ],
    recommendation: `Embrace ${profile.currentArchetype} mode and integrate ${profile.secondaryArchetypes[0]} aspects`,
  });

  // Transformation arc
  if (profile.transformationArc) {
    insights.push({
      type: "pattern_shift",
      description: `Transforming from ${profile.transformationArc.from} to ${profile.transformationArc.to}`,
      confidence: profile.transformationArc.progress,
      evidence: ["Life chapter transitions detected", "Pattern shifts in behavior"],
      recommendation: `Focus on practices that support ${profile.transformationArc.to} archetype`,
    });
  }

  // Identity tension
  if (profile.identityTension) {
    insights.push({
      type: "tension_detected",
      description: profile.identityTension.description,
      confidence: profile.identityTension.intensity,
      evidence: ["Conflicting archetype patterns", "Behavioral inconsistencies"],
      recommendation: "Explore integration practices to resolve tension",
    });
  }

  // Growth edges
  if (profile.growthEdges.length > 0) {
    insights.push({
      type: "growth_edge",
      description: `Growth opportunities: ${profile.growthEdges.join(", ")}`,
      confidence: 0.7,
      evidence: profile.growthEdges,
      recommendation: `Focus on ${profile.growthEdges[0]} as primary growth edge`,
    });
  }

  return insights;
}



