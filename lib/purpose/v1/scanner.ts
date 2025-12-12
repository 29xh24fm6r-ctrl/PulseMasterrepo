// Mission Scanner v1
// lib/purpose/v1/scanner.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PulseCortexContext } from "@/lib/cortex/types";
import { MissionProfile, MissionInsight, IdentityRole } from "./types";
import { scanIdentity } from "@/lib/identity/v3";

/**
 * Scan user data to derive mission profile
 */
export async function scanMission(
  userId: string,
  ctx: PulseCortexContext
): Promise<MissionProfile> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get identity profile
  const identityProfile = await scanIdentity(userId, ctx);

  // Analyze journals and narratives
  const narratives = await analyzeNarratives(dbUserId, ctx);

  // Detect recurring themes
  const recurringThemes = detectRecurringThemes(ctx, narratives);

  // Detect core motivations
  const coreMotivations = detectCoreMotivations(ctx, identityProfile);

  // Detect shadow conflicts
  const shadowConflicts = detectShadowConflicts(ctx, identityProfile);

  // Detect identity drivers
  const identityDrivers = detectIdentityDrivers(ctx, identityProfile);

  // Generate mission statement
  const mission = generateMissionStatement(identityProfile, recurringThemes, coreMotivations);

  // Generate narrative
  const narrative = generateNarrative(ctx, identityProfile, recurringThemes);

  // Generate north star
  const northStar = generateNorthStar(identityProfile, coreMotivations);

  // Generate future path candidates
  const futurePathCandidates = generateFuturePathCandidates(ctx, identityProfile);

  // Build mission arcs (will be enhanced by arc-builder)
  const oneYearArc = await buildOneYearArc(ctx, identityProfile);
  const ninetyDayArc = await buildNinetyDayArc(ctx, identityProfile);

  return {
    mission,
    narrative,
    northStar,
    oneYearArc,
    ninetyDayArc,
    identityDrivers,
    shadowConflicts,
    coreMotivations,
    recurringThemes,
    futurePathCandidates,
  };
}

/**
 * Analyze narratives from journals and third brain
 */
async function analyzeNarratives(
  dbUserId: string,
  ctx: PulseCortexContext
): Promise<string[]> {
  const narratives: string[] = [];

  // Get from third brain memories
  const topMemories = ctx.memory.topMemories || [];
  for (const memory of topMemories.slice(0, 10)) {
    if (memory.content) {
      narratives.push(memory.content);
    }
  }

  // Get from journals if available
  try {
    const { data: journals } = await supabaseAdmin
      .from("journals")
      .select("content")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (journals) {
      for (const journal of journals) {
        if (journal.content) {
          narratives.push(journal.content);
        }
      }
    }
  } catch (err) {
    // Journals table might not exist
  }

  return narratives;
}

/**
 * Detect recurring themes
 */
function detectRecurringThemes(
  ctx: PulseCortexContext,
  narratives: string[]
): string[] {
  const themes: string[] = [];

  // Analyze longitudinal chapters
  const chapters = ctx.longitudinal.chapters;
  const allThemes = chapters.flatMap((c) => c.majorThemes || []);
  const themeCounts = new Map<string, number>();

  for (const theme of allThemes) {
    themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
  }

  // Get top themes
  const topThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);

  themes.push(...topThemes);

  // Analyze XP distribution
  const xpBreakdown = ctx.xp.domainBreakdown || {};
  const topDomain = Object.entries(xpBreakdown)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topDomain) {
    themes.push(`${topDomain}_focus`);
  }

  // Analyze patterns
  const patterns = ctx.longitudinal.aggregatedPatterns;
  for (const pattern of patterns) {
    if (pattern.type === "productivity_arc") {
      themes.push("productivity_mastery");
    }
    if (pattern.type === "burnout_cycle") {
      themes.push("work_life_balance");
    }
  }

  return [...new Set(themes)];
}

/**
 * Detect core motivations
 */
function detectCoreMotivations(
  ctx: PulseCortexContext,
  identityProfile: any
): string[] {
  const motivations: string[] = [];

  // Identity-based motivations
  const archetype = identityProfile.currentArchetype;
  const archetypeMotivations: Record<string, string[]> = {
    warrior: ["excellence", "discipline", "achievement"],
    strategist: ["optimization", "planning", "efficiency"],
    creator: ["expression", "innovation", "beauty"],
    builder: ["construction", "systems", "legacy"],
    stoic: ["wisdom", "peace", "acceptance"],
    leader: ["influence", "impact", "service"],
    sage: ["understanding", "teaching", "wisdom"],
  };

  motivations.push(...(archetypeMotivations[archetype] || []));

  // XP-based motivations
  const xpBreakdown = ctx.xp.domainBreakdown || {};
  if (xpBreakdown.work && xpBreakdown.work > 100) {
    motivations.push("professional_growth");
  }
  if (xpBreakdown.relationships && xpBreakdown.relationships > 100) {
    motivations.push("connection");
  }

  // Pattern-based motivations
  const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  if (productivityArcs.length > 0) {
    motivations.push("productivity");
  }

  return [...new Set(motivations)];
}

/**
 * Detect shadow conflicts
 */
function detectShadowConflicts(
  ctx: PulseCortexContext,
  identityProfile: any
): string[] {
  const conflicts: string[] = [];

  // Identity tension
  if (identityProfile.identityTension) {
    conflicts.push(identityProfile.identityTension.type);
  }

  // Shadow patterns
  if (identityProfile.shadowPatterns) {
    conflicts.push(...identityProfile.shadowPatterns);
  }

  // Burnout patterns
  const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle"
  );
  if (burnoutPatterns.length > 0) {
    conflicts.push("overwork_tendency");
  }

  // Procrastination patterns
  const procrastinationPatterns = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "procrastination_cycle"
  );
  if (procrastinationPatterns.length > 0) {
    conflicts.push("task_avoidance");
  }

  return conflicts;
}

/**
 * Detect identity drivers
 */
function detectIdentityDrivers(
  ctx: PulseCortexContext,
  identityProfile: any
): string[] {
  const drivers: string[] = [];

  // Strengths drive identity
  drivers.push(...identityProfile.strengths);

  // Growth edges drive transformation
  drivers.push(...identityProfile.growthEdges);

  // Archetype drives behavior
  drivers.push(identityProfile.currentArchetype);

  return drivers;
}

/**
 * Generate mission statement
 */
function generateMissionStatement(
  identityProfile: any,
  themes: string[],
  motivations: string[]
): string {
  const archetype = identityProfile.currentArchetype;
  const topTheme = themes[0] || "growth";
  const topMotivation = motivations[0] || "excellence";

  const missionTemplates: Record<string, string> = {
    warrior: `To achieve ${topMotivation} through disciplined action and continuous improvement`,
    strategist: `To optimize and plan for ${topTheme} through strategic thinking`,
    creator: `To express and innovate in ${topTheme} through creative work`,
    builder: `To construct lasting systems and legacy in ${topTheme}`,
    stoic: `To find wisdom and peace through ${topTheme}`,
    leader: `To create impact and influence through ${topTheme}`,
    sage: `To understand and teach ${topTheme} through deep learning`,
  };

  return missionTemplates[archetype] || `To pursue ${topMotivation} in ${topTheme}`;
}

/**
 * Generate narrative
 */
function generateNarrative(
  ctx: PulseCortexContext,
  identityProfile: any,
  themes: string[]
): string {
  const chapters = ctx.longitudinal.chapters;
  const recentChapters = chapters.slice(-3);

  if (recentChapters.length === 0) {
    return `A journey of ${identityProfile.currentArchetype} development, focused on ${themes.join(", ")}`;
  }

  const chapterTitles = recentChapters.map((c) => c.title).join(" → ");
  return `From ${chapterTitles}, evolving as a ${identityProfile.currentArchetype} with focus on ${themes[0]}`;
}

/**
 * Generate north star
 */
function generateNorthStar(
  identityProfile: any,
  motivations: string[]
): string {
  const archetype = identityProfile.currentArchetype;
  const topMotivation = motivations[0] || "excellence";

  const northStarTemplates: Record<string, string> = {
    warrior: `Ultimate ${topMotivation} through mastery and discipline`,
    strategist: `Optimal life through strategic planning and execution`,
    creator: `Creative expression and innovation in all domains`,
    builder: `Lasting systems and structures that serve others`,
    stoic: `Inner peace and wisdom through acceptance`,
    leader: `Maximum positive impact through influence`,
    sage: `Deep understanding and teaching of life's truths`,
  };

  return northStarTemplates[archetype] || `Ultimate ${topMotivation}`;
}

/**
 * Generate future path candidates
 */
function generateFuturePathCandidates(
  ctx: PulseCortexContext,
  identityProfile: any
): string[] {
  const candidates: string[] = [];

  // Based on transformation arc
  if (identityProfile.transformationArc) {
    candidates.push(`Transition to ${identityProfile.transformationArc.to} archetype`);
  }

  // Based on strategic arcs
  const arcs = ctx.domains.strategy?.arcs || [];
  for (const arc of arcs.slice(0, 3)) {
    candidates.push(`Complete strategic arc: ${arc.name}`);
  }

  // Based on growth edges
  for (const edge of identityProfile.growthEdges.slice(0, 2)) {
    candidates.push(`Develop: ${edge}`);
  }

  return candidates;
}

/**
 * Build one-year arc
 */
async function buildOneYearArc(
  ctx: PulseCortexContext,
  identityProfile: any
): Promise<MissionProfile["oneYearArc"]> {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  // Generate milestones (quarterly)
  const milestones = [
    {
      date: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Q1 milestone: Establish foundation",
      importance: 70,
    },
    {
      date: new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Q2 milestone: Build momentum",
      importance: 80,
    },
    {
      date: new Date(startDate.getTime() + 270 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Q3 milestone: Accelerate growth",
      importance: 85,
    },
    {
      date: endDate.toISOString(),
      description: "Q4 milestone: Achieve transformation",
      importance: 90,
    },
  ];

  // Generate identity roles
  const identityRoles: IdentityRole[] = [
    {
      archetype: identityProfile.currentArchetype,
      role: `Primary ${identityProfile.currentArchetype}`,
      weight: 0.8,
      practices: identityProfile.strengths.slice(0, 3),
    },
  ];

  if (identityProfile.secondaryArchetypes.length > 0) {
    identityRoles.push({
      archetype: identityProfile.secondaryArchetypes[0],
      role: `Secondary ${identityProfile.secondaryArchetypes[0]}`,
      weight: 0.5,
      practices: [],
    });
  }

  return {
    title: `One-Year ${identityProfile.currentArchetype} Arc`,
    description: `Year-long journey toward ${identityProfile.currentArchetype} mastery`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    milestones,
    identityRoles,
    alignmentIndicators: identityProfile.strengths,
    progress: 0,
  };
}

/**
 * Build ninety-day arc
 */
async function buildNinetyDayArc(
  ctx: PulseCortexContext,
  identityProfile: any
): Promise<MissionProfile["ninetyDayArc"]> {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 90);

  // Generate milestones (monthly)
  const milestones = [
    {
      date: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Month 1: Establish practices",
      importance: 70,
    },
    {
      date: new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Month 2: Build consistency",
      importance: 80,
    },
    {
      date: endDate.toISOString(),
      description: "Month 3: Accelerate transformation",
      importance: 90,
    },
  ];

  // Generate identity roles
  const identityRoles: IdentityRole[] = [
    {
      archetype: identityProfile.currentArchetype,
      role: `90-Day ${identityProfile.currentArchetype}`,
      weight: 1.0,
      practices: identityProfile.strengths.slice(0, 5),
    },
  ];

  // Calculate progress based on current state
  let progress = 0;
  if (identityProfile.transformationArc) {
    progress = identityProfile.transformationArc.progress;
  }

  return {
    title: `90-Day ${identityProfile.currentArchetype} Sprint`,
    description: `Intensive 90-day focus on ${identityProfile.currentArchetype} development`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    milestones,
    identityRoles,
    alignmentIndicators: identityProfile.strengths,
    progress,
  };
}

/**
 * Generate mission insights
 */
export async function generateMissionInsights(
  profile: MissionProfile,
  ctx: PulseCortexContext
): Promise<MissionInsight[]> {
  const insights: MissionInsight[] = [];

  // Theme insights
  insights.push({
    type: "theme",
    description: `Recurring themes: ${profile.recurringThemes.join(", ")}`,
    confidence: 0.8,
    evidence: profile.recurringThemes,
    recommendation: `Focus weekly plans on ${profile.recurringThemes[0]}`,
  });

  // Motivation insights
  insights.push({
    type: "motivation",
    description: `Core motivations: ${profile.coreMotivations.join(", ")}`,
    confidence: 0.7,
    evidence: profile.coreMotivations,
    recommendation: `Align daily actions with ${profile.coreMotivations[0]}`,
  });

  // Conflict insights
  if (profile.shadowConflicts.length > 0) {
    insights.push({
      type: "conflict",
      description: `Shadow conflicts: ${profile.shadowConflicts.join(", ")}`,
      confidence: 0.6,
      evidence: profile.shadowConflicts,
      recommendation: `Address ${profile.shadowConflicts[0]} through awareness and practice`,
    });
  }

  // Direction insights
  if (profile.futurePathCandidates.length > 0) {
    insights.push({
      type: "direction",
      description: `Future paths: ${profile.futurePathCandidates.join(", ")}`,
      confidence: 0.7,
      evidence: profile.futurePathCandidates,
      recommendation: `Explore ${profile.futurePathCandidates[0]}`,
    });
  }

  // Alignment insights
  const alignmentScore = calculateMissionAlignment(profile, ctx);
  insights.push({
    type: "alignment",
    description: `Mission alignment: ${Math.round(alignmentScore * 100)}%`,
    confidence: 0.8,
    evidence: [`Identity: ${profile.identityDrivers[0]}`, `Mission: ${profile.mission}`],
    recommendation: alignmentScore < 0.7
      ? "Increase alignment between daily actions and mission"
      : "Maintain strong mission alignment",
  });

  return insights;
}

/**
 * Calculate mission alignment score
 */
function calculateMissionAlignment(profile: MissionProfile, ctx: PulseCortexContext): number {
  let score = 0.5;

  // Check if strategic arcs align with mission
  const arcs = ctx.domains.strategy?.arcs || [];
  if (arcs.length > 0) {
    score += 0.2;
  }

  // Check if identity drivers align
  if (profile.identityDrivers.length > 0) {
    score += 0.2;
  }

  // Check if recurring themes are active
  if (profile.recurringThemes.length > 0) {
    score += 0.1;
  }

  return Math.min(1.0, score);
}



