// Deep Narrative Engine Builder
// lib/cortex/sovereign/deep-narrative/builder.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PulseCortexContext } from "@/lib/cortex/types";
import { LifeNarrative, NarrativeTheme } from "./types";
import { scanIdentity } from "@/lib/identity/v3";
import { scanMission } from "@/lib/purpose/v1/scanner";
import { v4 as uuidv4 } from "uuid";

/**
 * Build complete life narrative
 */
export async function buildLifeNarrative(
  userId: string,
  ctx: PulseCortexContext
): Promise<LifeNarrative> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get identity and mission profiles
  const identityProfile = await scanIdentity(userId, ctx);
  const missionProfile = await scanMission(userId, ctx);

  // Build chapter summaries from longitudinal model
  const chapterSummaries = buildChapterSummaries(ctx);

  // Get current chapter
  const currentChapter = ctx.longitudinal.chapters[ctx.longitudinal.chapters.length - 1] || {
    id: "current",
    title: "Current Chapter",
    start: new Date().toISOString(),
  };

  // Detect dominant themes
  const dominantThemes = detectDominantThemes(ctx, identityProfile, missionProfile);

  // Detect growth edges
  const growthEdges = detectGrowthEdges(ctx, identityProfile);

  // Detect repeating conflicts
  const repeatingConflicts = detectRepeatingConflicts(ctx, identityProfile);

  // Detect emerging possibilities
  const emergingPossibilities = detectEmergingPossibilities(ctx, identityProfile, missionProfile);

  // Determine narrative arc
  const narrativeArc = determineNarrativeArc(ctx, chapterSummaries);

  // Generate key insights
  const keyInsights = generateKeyInsights(
    dominantThemes,
    growthEdges,
    repeatingConflicts,
    emergingPossibilities
  );

  return {
    userId: dbUserId,
    updatedAt: new Date().toISOString(),
    currentChapterTitle: currentChapter.title,
    currentChapterSummary: currentChapter.narrativeSummary || "Building your story...",
    chapterSummaries,
    dominantThemes,
    growthEdges,
    repeatingConflicts,
    emergingPossibilities,
    narrativeArc,
    keyInsights,
  };
}

/**
 * Build chapter summaries from longitudinal model
 */
function buildChapterSummaries(ctx: PulseCortexContext): LifeNarrative["chapterSummaries"] {
  const summaries: LifeNarrative["chapterSummaries"] = [];

  for (const chapter of ctx.longitudinal.chapters.slice(-10)) {
    summaries.push({
      id: chapter.id,
      title: chapter.title,
      summary: chapter.narrativeSummary || `Chapter: ${chapter.title}`,
      startDate: chapter.start,
      endDate: chapter.end,
      dominantThemes: chapter.majorThemes || [],
    });
  }

  return summaries;
}

/**
 * Detect dominant themes
 */
function detectDominantThemes(
  ctx: PulseCortexContext,
  identityProfile: any,
  missionProfile: any
): NarrativeTheme[] {
  const themes: NarrativeTheme[] = [];

  // Identity-based themes
  const archetype = identityProfile.currentArchetype;
  const archetypeThemes: Record<string, NarrativeTheme> = {
    warrior: {
      id: uuidv4(),
      label: "Discipline & Excellence",
      description: "Pursuit of mastery through disciplined action",
      positivePole: "Achievement and victory",
      negativePole: "Burnout and overwork",
      strength: 0.8,
    },
    strategist: {
      id: uuidv4(),
      label: "Planning & Optimization",
      description: "Strategic thinking and systematic improvement",
      positivePole: "Efficiency and clarity",
      negativePole: "Analysis paralysis",
      strength: 0.8,
    },
    creator: {
      id: uuidv4(),
      label: "Expression & Innovation",
      description: "Creative expression and novel solutions",
      positivePole: "Inspiration and beauty",
      negativePole: "Perfectionism and isolation",
      strength: 0.8,
    },
    builder: {
      id: uuidv4(),
      label: "Construction & Legacy",
      description: "Building lasting systems and structures",
      positivePole: "Impact and permanence",
      negativePole: "Rigidity and control",
      strength: 0.8,
    },
    stoic: {
      id: uuidv4(),
      label: "Wisdom & Acceptance",
      description: "Inner peace through acceptance",
      positivePole: "Calm and clarity",
      negativePole: "Passivity and detachment",
      strength: 0.8,
    },
    leader: {
      id: uuidv4(),
      label: "Influence & Service",
      description: "Leading others toward shared goals",
      positivePole: "Impact and connection",
      negativePole: "Control and manipulation",
      strength: 0.8,
    },
    sage: {
      id: uuidv4(),
      label: "Understanding & Teaching",
      description: "Deep learning and wisdom sharing",
      positivePole: "Insight and growth",
      negativePole: "Isolation and abstraction",
      strength: 0.8,
    },
  };

  if (archetypeThemes[archetype]) {
    themes.push(archetypeThemes[archetype]);
  }

  // Mission-based themes
  if (missionProfile.recurringThemes.length > 0) {
    for (const themeLabel of missionProfile.recurringThemes.slice(0, 3)) {
      themes.push({
        id: uuidv4(),
        label: themeLabel,
        description: `Recurring theme: ${themeLabel}`,
        positivePole: `Growth in ${themeLabel}`,
        negativePole: `Stagnation in ${themeLabel}`,
        strength: 0.6,
      });
    }
  }

  // Pattern-based themes
  const patterns = ctx.longitudinal.aggregatedPatterns;
  if (patterns.some((p) => p.type === "productivity_arc")) {
    themes.push({
      id: uuidv4(),
      label: "Productivity Mastery",
      description: "Sustained high performance",
      positivePole: "Flow and achievement",
      negativePole: "Burnout risk",
      strength: 0.7,
    });
  }

  if (patterns.some((p) => p.type === "burnout_cycle")) {
    themes.push({
      id: uuidv4(),
      label: "Work-Life Balance",
      description: "Struggle to maintain equilibrium",
      positivePole: "Sustainable rhythm",
      negativePole: "Exhaustion and neglect",
      strength: 0.7,
    });
  }

  return themes.slice(0, 5); // Top 5 themes
}

/**
 * Detect growth edges
 */
function detectGrowthEdges(ctx: PulseCortexContext, identityProfile: any): string[] {
  const edges: string[] = [];

  // From identity profile
  edges.push(...identityProfile.growthEdges);

  // From blindspots
  for (const blindspot of identityProfile.blindspots) {
    edges.push(`Address ${blindspot}`);
  }

  // From patterns
  const procrastinationPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "procrastination_cycle"
  );
  if (procrastinationPatterns.length > 0) {
    edges.push("Develop execution discipline");
  }

  return [...new Set(edges)].slice(0, 5);
}

/**
 * Detect repeating conflicts
 */
function detectRepeatingConflicts(
  ctx: PulseCortexContext,
  identityProfile: any
): string[] {
  const conflicts: string[] = [];

  // Identity tension
  if (identityProfile.identityTension) {
    conflicts.push(identityProfile.identityTension.description);
  }

  // Shadow patterns
  conflicts.push(...(identityProfile.shadowPatterns || []));

  // Pattern conflicts
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  if (burnoutPatterns.length > 0) {
    conflicts.push("Overwork vs rest");
  }

  const procrastinationPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "procrastination_cycle"
  );
  if (procrastinationPatterns.length > 0) {
    conflicts.push("Desire vs action");
  }

  return [...new Set(conflicts)].slice(0, 5);
}

/**
 * Detect emerging possibilities
 */
function detectEmergingPossibilities(
  ctx: PulseCortexContext,
  identityProfile: any,
  missionProfile: any
): string[] {
  const possibilities: string[] = [];

  // Transformation arc
  if (identityProfile.transformationArc) {
    possibilities.push(
      `Transform to ${identityProfile.transformationArc.to} archetype`
    );
  }

  // Future path candidates
  possibilities.push(...missionProfile.futurePathCandidates);

  // Strategic arcs
  const arcs = ctx.domains.strategy?.arcs || [];
  for (const arc of arcs.slice(0, 3)) {
    possibilities.push(`Complete strategic arc: ${arc.name}`);
  }

  // Opportunity windows from simulation
  // Would need to run simulation, but for now use patterns
  const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  if (productivityArcs.length > 0) {
    possibilities.push("Capitalize on productivity momentum");
  }

  return [...new Set(possibilities)].slice(0, 5);
}

/**
 * Determine narrative arc
 */
function determineNarrativeArc(
  ctx: PulseCortexContext,
  chapterSummaries: LifeNarrative["chapterSummaries"]
): LifeNarrative["narrativeArc"] {
  // Check recent chapters for trajectory
  if (chapterSummaries.length < 2) return "stable";

  const recentChapters = chapterSummaries.slice(-3);
  const themes = recentChapters.flatMap((c) => c.dominantThemes);

  // Check for transformation
  if (themes.length > 5) return "transforming";

  // Check emotion trends
  const emotion = ctx.emotion;
  if (emotion) {
    if (emotion.detected_emotion === "motivated" || emotion.detected_emotion === "excited") {
      return "rising";
    }
    if (emotion.detected_emotion === "stressed" || emotion.detected_emotion === "overwhelmed") {
      return "falling";
    }
  }

  // Check patterns
  const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  if (productivityArcs.length > 0) return "rising";

  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  if (burnoutPatterns.length > 0) return "falling";

  return "stable";
}

/**
 * Generate key insights
 */
function generateKeyInsights(
  themes: NarrativeTheme[],
  growthEdges: string[],
  conflicts: string[],
  possibilities: string[]
): string[] {
  const insights: string[] = [];

  if (themes.length > 0) {
    insights.push(`Dominant theme: ${themes[0].label}`);
  }

  if (growthEdges.length > 0) {
    insights.push(`Primary growth edge: ${growthEdges[0]}`);
  }

  if (conflicts.length > 0) {
    insights.push(`Key conflict: ${conflicts[0]}`);
  }

  if (possibilities.length > 0) {
    insights.push(`Emerging possibility: ${possibilities[0]}`);
  }

  return insights;
}



