// Sovereign Intelligence Mode Engine
// lib/cortex/sovereign/sovereign-intelligence/sim-engine.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { getBehaviorProfile, updateBehaviorProfile } from "./profile-store";
import { BehaviorProfile, BehaviorUpdate, SovereignUpdateContext } from "./types";
import { logTrace } from "@/lib/cortex/trace/trace";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Run sovereign intelligence update
 */
export async function runSovereignUpdate(
  userId: string,
  ctx: PulseCortexContext
): Promise<BehaviorProfile> {
  const profile = await getBehaviorProfile(userId);
  const updateContext = await buildUpdateContext(userId, ctx);

  const updates: BehaviorUpdate[] = [];

  // 1. Adjust pushIntensity based on ignored nudges + stress
  const pushIntensityUpdate = adjustPushIntensity(profile, updateContext);
  if (pushIntensityUpdate) updates.push(pushIntensityUpdate);

  // 2. Adjust autonomyLevel based on acceptance rate + outcomes
  const autonomyUpdate = adjustAutonomyLevel(profile, updateContext);
  if (autonomyUpdate) updates.push(autonomyUpdate);

  // 3. Adjust domainWeights based on unaddressed risks/neglected goals
  const domainWeightsUpdate = adjustDomainWeights(profile, ctx, updateContext);
  if (domainWeightsUpdate) updates.push(domainWeightsUpdate);

  // 4. Adjust guidanceStyle based on user feedback
  const guidanceStyleUpdate = adjustGuidanceStyle(profile, updateContext);
  if (guidanceStyleUpdate) updates.push(guidanceStyleUpdate);

  // Apply updates if any
  if (updates.length > 0) {
    const newProfile = applyUpdates(profile, updates);
    await updateBehaviorProfile(userId, {
      ...newProfile,
      version: profile.version + 1,
      lastUpdateReason: updates.map((u) => u.reason).join("; "),
    });

    // Log all updates to trace
    for (const update of updates) {
      await logTrace(
        userId,
        "cortex",
        "info",
        `Sovereign update: ${update.field} changed`,
        {
          field: update.field,
          oldValue: update.oldValue,
          newValue: update.newValue,
          reason: update.reason,
          confidence: update.confidence,
        },
        { domain: "sovereign_intelligence" }
      );
    }

    return newProfile;
  }

  return profile;
}

/**
 * Build update context from recent data
 */
async function buildUpdateContext(
  userId: string,
  ctx: PulseCortexContext
): Promise<SovereignUpdateContext> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get recent intervention outcomes
  const { data: interventions } = await supabaseAdmin
    .from("intervention_outcomes")
    .select("*")
    .eq("user_id", dbUserId)
    .order("timestamp", { ascending: false })
    .limit(50);

  const recentActions = (interventions || []).map((i) => ({
    action: i.intervention_type,
    accepted: i.acted_on || false,
    timestamp: i.timestamp,
  }));

  // Calculate XP outcomes
  const xpDelta = ctx.xp.totalXP - (ctx.xp.totalXP || 0); // Simplified
  const xpBreakdown = ctx.xp.domainBreakdown || {};

  // Get user feedback
  const userFeedback = (interventions || [])
    .filter((i) => i.user_feedback)
    .map((i) => ({
      type: i.user_feedback as "positive" | "negative" | "neutral",
      context: i.intervention_type,
      timestamp: i.timestamp,
    }));

  // Emotion trends
  const emotion = ctx.emotion;
  const emotionTrends = {
    averageIntensity: emotion?.intensity || 0.5,
    dominantEmotion: emotion?.detected_emotion || "neutral",
    stressLevel: emotion?.detected_emotion === "stressed" ? emotion.intensity : 0,
  };

  // Streak data
  const streakData = {
    currentStreak: ctx.xp.streakDays || 0,
    streakChanges: 0, // Would need historical data
  };

  return {
    recentActions,
    xpOutcomes: {
      delta: xpDelta,
      domainBreakdown: xpBreakdown,
    },
    userFeedback,
    emotionTrends,
    streakData,
  };
}

/**
 * Adjust push intensity
 */
function adjustPushIntensity(
  profile: BehaviorProfile,
  context: SovereignUpdateContext
): BehaviorUpdate | null {
  const intensityLevels: BehaviorProfile["pushIntensity"][] = ["gentle", "balanced", "assertive"];
  const currentIndex = intensityLevels.indexOf(profile.pushIntensity);

  // Count ignored high-pressure nudges
  const ignoredCount = context.recentActions.filter(
    (a) => !a.accepted && a.action.includes("urgent")
  ).length;

  // Check stress level
  const isStressed = context.emotionTrends.stressLevel > 0.7;

  // Reduce intensity if many ignored + stressed
  if (ignoredCount > 3 && isStressed && currentIndex > 0) {
    return {
      field: "pushIntensity",
      oldValue: profile.pushIntensity,
      newValue: intensityLevels[currentIndex - 1],
      reason: `Reduced push intensity due to ${ignoredCount} ignored nudges and high stress`,
      confidence: 0.7,
      timestamp: new Date().toISOString(),
    };
  }

  // Increase intensity if high acceptance + low stress
  const acceptanceRate =
    context.recentActions.length > 0
      ? context.recentActions.filter((a) => a.accepted).length / context.recentActions.length
      : 0;

  if (acceptanceRate > 0.8 && !isStressed && currentIndex < intensityLevels.length - 1) {
    return {
      field: "pushIntensity",
      oldValue: profile.pushIntensity,
      newValue: intensityLevels[currentIndex + 1],
      reason: `Increased push intensity due to high acceptance rate (${Math.round(acceptanceRate * 100)}%)`,
      confidence: 0.6,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Adjust autonomy level
 */
function adjustAutonomyLevel(
  profile: BehaviorProfile,
  context: SovereignUpdateContext
): BehaviorUpdate | null {
  const autonomyLevels: BehaviorProfile["autonomyLevel"][] = ["low", "medium", "high"];
  const currentIndex = autonomyLevels.indexOf(profile.autonomyLevel);

  // Calculate acceptance rate
  const acceptanceRate =
    context.recentActions.length > 0
      ? context.recentActions.filter((a) => a.accepted).length / context.recentActions.length
      : 0;

  // Check XP/streak trends
  const isImproving = context.xpOutcomes.delta > 0 && context.streakData.currentStreak > 7;

  // Increase autonomy if high acceptance + improving outcomes
  if (acceptanceRate > 0.75 && isImproving && currentIndex < autonomyLevels.length - 1) {
    return {
      field: "autonomyLevel",
      oldValue: profile.autonomyLevel,
      newValue: autonomyLevels[currentIndex + 1],
      reason: `Increased autonomy level due to high acceptance (${Math.round(acceptanceRate * 100)}%) and positive outcomes`,
      confidence: 0.7,
      timestamp: new Date().toISOString(),
    };
  }

  // Decrease autonomy if low acceptance
  if (acceptanceRate < 0.3 && currentIndex > 0) {
    return {
      field: "autonomyLevel",
      oldValue: profile.autonomyLevel,
      newValue: autonomyLevels[currentIndex - 1],
      reason: `Decreased autonomy level due to low acceptance rate (${Math.round(acceptanceRate * 100)}%)`,
      confidence: 0.6,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Adjust domain weights
 */
function adjustDomainWeights(
  profile: BehaviorProfile,
  ctx: PulseCortexContext,
  context: SovereignUpdateContext
): BehaviorUpdate | null {
  const weights = { ...profile.domainWeights };
  let changed = false;

  // Check for unaddressed risks
  const risks = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "burnout_cycle" || p.type === "financial_stress_window"
  );

  // Increase weight for domains with risks
  for (const risk of risks) {
    const domain = risk.domain || "life";
    if (weights[domain] !== undefined && weights[domain] < 0.3) {
      weights[domain] = Math.min(0.4, weights[domain] + 0.1);
      changed = true;
    }
  }

  // Check for neglected relationships
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const neglected = relationships.filter((p) => p.daysSinceInteraction > 30);
  if (neglected.length > 3 && weights.relationships < 0.3) {
    weights.relationships = Math.min(0.4, weights.relationships + 0.1);
    changed = true;
  }

  // Normalize weights
  if (changed) {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    for (const key in weights) {
      weights[key] = weights[key] / total;
    }

    return {
      field: "domainWeights",
      oldValue: profile.domainWeights,
      newValue: weights,
      reason: "Adjusted domain weights based on unaddressed risks and neglected areas",
      confidence: 0.6,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Adjust guidance style
 */
function adjustGuidanceStyle(
  profile: BehaviorProfile,
  context: SovereignUpdateContext
): BehaviorUpdate | null {
  const styles: BehaviorProfile["guidanceStyle"][] = [
    "coaching",
    "advisory",
    "directive",
    "reflective",
  ];
  const currentIndex = styles.indexOf(profile.guidanceStyle);

  // Analyze feedback
  const positiveFeedback = context.userFeedback.filter((f) => f.type === "positive").length;
  const negativeFeedback = context.userFeedback.filter((f) => f.type === "negative").length;

  // Move toward coaching if positive feedback on reflective/coaching
  if (positiveFeedback > negativeFeedback * 2 && currentIndex > 0) {
    return {
      field: "guidanceStyle",
      oldValue: profile.guidanceStyle,
      newValue: styles[currentIndex - 1],
      reason: `Shifted toward ${styles[currentIndex - 1]} style due to positive feedback`,
      confidence: 0.5,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Apply updates to profile
 */
function applyUpdates(profile: BehaviorProfile, updates: BehaviorUpdate[]): BehaviorProfile {
  const updated = { ...profile };

  for (const update of updates) {
    (updated as any)[update.field] = update.newValue;
  }

  return updated;
}



