// Preference Learner
// lib/cortex/sovereign/meta-learning/preference-learner.ts

import { supabaseAdmin } from "@/lib/supabase";
import { UserPreferenceProfile } from "./types";

/**
 * Derive user intervention preferences from historical data
 */
export async function deriveUserInterventionPreferences(
  userId: string
): Promise<UserPreferenceProfile> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get recent interventions (last 100)
  const { data: interventions } = await supabaseAdmin
    .from("intervention_outcomes")
    .select("*")
    .eq("user_id", dbUserId)
    .order("timestamp", { ascending: false })
    .limit(100);

  if (!interventions || interventions.length === 0) {
    // Return default profile
    return createDefaultPreferenceProfile(dbUserId);
  }

  // Calculate intervention success rates
  const interventionSuccessRates: Record<string, number> = {};
  const interventionGroups = new Map<string, Array<{ actedOn: boolean }>>();

  for (const intervention of interventions) {
    if (!interventionGroups.has(intervention.intervention_type)) {
      interventionGroups.set(intervention.intervention_type, []);
    }
    interventionGroups.get(intervention.intervention_type)!.push({
      actedOn: intervention.acted_on || false,
    });
  }

  for (const [type, records] of interventionGroups.entries()) {
    const successCount = records.filter((r) => r.actedOn).length;
    interventionSuccessRates[type] = successCount / records.length;
  }

  // Calculate domain response profiles
  const domainResponseProfiles: UserPreferenceProfile["domainResponseProfiles"] = {};
  const domainGroups = new Map<
    string,
    Array<{
      actedOn: boolean;
      contextSnapshot: any;
      userFeedback?: string;
    }>
  >();

  for (const intervention of interventions) {
    if (!domainGroups.has(intervention.domain)) {
      domainGroups.set(intervention.domain, []);
    }
    domainGroups.get(intervention.domain)!.push({
      actedOn: intervention.acted_on || false,
      contextSnapshot: intervention.context_snapshot,
      userFeedback: intervention.user_feedback || undefined,
    });
  }

  for (const [domain, records] of domainGroups.entries()) {
    const actedOnCount = records.filter((r) => r.actedOn).length;
    const pushWorks = actedOnCount / records.length > 0.6; // High acceptance = push works
    const gentleWorks = records.filter(
      (r) => r.userFeedback === "positive" || r.userFeedback === "neutral"
    ).length / records.length > 0.5;

    // Determine best time window (simplified - would need time data)
    const bestTimeWindow = "afternoon"; // Placeholder

    domainResponseProfiles[domain] = {
      pushWorks,
      gentleWorks,
      bestTimeWindow,
    };
  }

  // Calculate persona tone preferences (would need persona data in interventions)
  const personaTonePreferences: Record<string, number> = {};
  // Placeholder - would analyze which personas get positive feedback

  // Calculate plan preferences
  const planAggressiveness = calculatePlanAggressiveness(interventions);
  const preferredPlanLength = calculatePreferredPlanLength(interventions);

  // Calculate nudge frequency preference
  const nudgeFrequency = calculateNudgeFrequency(interventions);
  const bestNudgeTimes = calculateBestNudgeTimes(interventions);

  // Generate key learnings
  const keyLearnings = generateKeyLearnings(
    interventionSuccessRates,
    domainResponseProfiles
  );

  return {
    userId: dbUserId,
    updatedAt: new Date().toISOString(),
    interventionSuccessRates,
    domainResponseProfiles,
    personaTonePreferences,
    planAggressiveness,
    preferredPlanLength,
    nudgeFrequency,
    bestNudgeTimes,
    keyLearnings,
  };
}

/**
 * Create default preference profile
 */
function createDefaultPreferenceProfile(userId: string): UserPreferenceProfile {
  return {
    userId,
    updatedAt: new Date().toISOString(),
    interventionSuccessRates: {},
    domainResponseProfiles: {},
    personaTonePreferences: {},
    planAggressiveness: 0.5,
    preferredPlanLength: 5,
    nudgeFrequency: "medium",
    bestNudgeTimes: ["morning", "afternoon"],
    keyLearnings: [],
  };
}

/**
 * Calculate plan aggressiveness preference
 */
function calculatePlanAggressiveness(interventions: any[]): number {
  // Analyze which plans get acted on
  const planInterventions = interventions.filter((i) =>
    i.intervention_type.includes("plan")
  );

  if (planInterventions.length === 0) return 0.5;

  const actedOnRate = planInterventions.filter((i) => i.acted_on).length / planInterventions.length;

  // Higher acted-on rate = can handle more aggressive plans
  return Math.min(1.0, actedOnRate * 1.2);
}

/**
 * Calculate preferred plan length
 */
function calculatePreferredPlanLength(interventions: any[]): number {
  // Placeholder - would need plan length data
  return 5;
}

/**
 * Calculate nudge frequency preference
 */
function calculateNudgeFrequency(interventions: any[]): "low" | "medium" | "high" {
  const recentInterventions = interventions.slice(0, 20);
  const actedOnRate =
    recentInterventions.filter((i) => i.acted_on).length / recentInterventions.length;

  if (actedOnRate > 0.7) return "high";
  if (actedOnRate > 0.4) return "medium";
  return "low";
}

/**
 * Calculate best nudge times
 */
function calculateBestNudgeTimes(interventions: any[]): string[] {
  // Placeholder - would need time data from interventions
  return ["morning", "afternoon"];
}

/**
 * Generate key learnings
 */
function generateKeyLearnings(
  successRates: Record<string, number>,
  domainProfiles: UserPreferenceProfile["domainResponseProfiles"]
): string[] {
  const learnings: string[] = [];

  // Find best intervention types
  const topInterventions = Object.entries(successRates)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topInterventions.length > 0) {
    learnings.push(
      `Best intervention types: ${topInterventions.map(([type]) => type).join(", ")}`
    );
  }

  // Find domains where push works
  const pushWorksDomains = Object.entries(domainProfiles)
    .filter(([_, profile]) => profile.pushWorks)
    .map(([domain]) => domain);

  if (pushWorksDomains.length > 0) {
    learnings.push(`Push works well in: ${pushWorksDomains.join(", ")}`);
  }

  // Find domains where gentle works
  const gentleWorksDomains = Object.entries(domainProfiles)
    .filter(([_, profile]) => profile.gentleWorks)
    .map(([domain]) => domain);

  if (gentleWorksDomains.length > 0) {
    learnings.push(`Gentle approach works in: ${gentleWorksDomains.join(", ")}`);
  }

  return learnings;
}



