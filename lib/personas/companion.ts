// Persona Companion Intelligence - Bonding Model
// lib/personas/companion.ts

import { supabaseAdmin } from "@/lib/supabase";

export type BondLevel = "acquaintance" | "ally" | "trusted" | "deep";

export interface CompanionState {
  id: string;
  userId: string;
  personaId: string;
  coachId?: string;
  warmthScore: number;      // 0–100
  trustScore: number;       // 0–100
  familiarityScore: number; // 0–100
  bondLevel: BondLevel;
  flags: string[];
  lastInteractionAt?: string;
  totalInteractions: number;
}

/**
 * Get companion state for user + persona
 */
export async function getCompanionState(
  userId: string,
  personaId: string,
  coachId?: string
): Promise<CompanionState | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!userRow) return null;

  const dbUserId = userRow.id;

  // Get or create companion state
  const { data: existing } = await supabaseAdmin
    .from("persona_companion_state")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("persona_id", personaId)
    .eq("coach_id", coachId || null)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      userId: existing.user_id,
      personaId: existing.persona_id,
      coachId: existing.coach_id || undefined,
      warmthScore: existing.warmth_score,
      trustScore: existing.trust_score,
      familiarityScore: existing.familiarity_score,
      bondLevel: existing.bond_level as BondLevel,
      flags: existing.flags || [],
      lastInteractionAt: existing.last_interaction_at || undefined,
      totalInteractions: existing.total_interactions,
    };
  }

  // Create default state
  const { data: newState } = await supabaseAdmin
    .from("persona_companion_state")
    .insert({
      user_id: dbUserId,
      persona_id: personaId,
      coach_id: coachId || null,
      warmth_score: 50,
      trust_score: 50,
      familiarity_score: 50,
      bond_level: "acquaintance",
      flags: [],
      total_interactions: 0,
    })
    .select("*")
    .single();

  if (!newState) return null;

  return {
    id: newState.id,
    userId: newState.user_id,
    personaId: newState.persona_id,
    coachId: newState.coach_id || undefined,
    warmthScore: newState.warmth_score,
    trustScore: newState.trust_score,
    familiarityScore: newState.familiarity_score,
    bondLevel: newState.bond_level as BondLevel,
    flags: newState.flags || [],
    lastInteractionAt: newState.last_interaction_at || undefined,
    totalInteractions: newState.total_interactions,
  };
}

/**
 * Calculate bond level from scores and interactions
 */
function calculateBondLevel(
  warmthScore: number,
  trustScore: number,
  familiarityScore: number,
  totalInteractions: number
): BondLevel {
  const avgScore = (warmthScore + trustScore + familiarityScore) / 3;

  if (totalInteractions < 5 || avgScore < 40) {
    return "acquaintance";
  }

  if (avgScore >= 80 && trustScore >= 75 && totalInteractions >= 20) {
    return "deep";
  }

  if (avgScore >= 65 && trustScore >= 60 && totalInteractions >= 10) {
    return "trusted";
  }

  if (avgScore >= 50 || totalInteractions >= 5) {
    return "ally";
  }

  return "acquaintance";
}

/**
 * Update companion state after interaction
 */
export async function updateCompanionAfterInteraction(params: {
  userId: string;
  personaId: string;
  coachId?: string;
  outcomeTag?: "positive" | "neutral" | "negative";
  emotionalShift?: number;           // change in Emotion OS intensity
  eventType?: string;                // 'big_win', 'setback', 'grief', etc.
}): Promise<void> {
  const { userId, personaId, coachId, outcomeTag, emotionalShift, eventType } = params;

  const state = await getCompanionState(userId, personaId, coachId);
  if (!state) return;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!userRow) return;

  const dbUserId = userRow.id;

  // Calculate score deltas
  let warmthDelta = 0;
  let trustDelta = 0;
  let familiarityDelta = 1; // Always increase familiarity with interaction

  if (outcomeTag === "positive") {
    warmthDelta = 3;
    trustDelta = 2;
  } else if (outcomeTag === "negative") {
    warmthDelta = -2;
    trustDelta = -1;
  }

  // Adjust for emotional shift
  if (emotionalShift !== undefined) {
    if (emotionalShift > 0.2) {
      // Positive emotional shift
      warmthDelta += 1;
    } else if (emotionalShift < -0.2) {
      // Negative emotional shift
      warmthDelta -= 1;
    }
  }

  // Adjust for event types
  if (eventType === "big_win") {
    warmthDelta += 2;
    trustDelta += 3;
  } else if (eventType === "setback") {
    warmthDelta += 1; // Increase warmth during setbacks
    trustDelta -= 1;
  } else if (eventType === "grief") {
    warmthDelta += 3; // High warmth during grief
    // Set grief_mode flag
  }

  // Calculate new scores (clamped to 0-100)
  const newWarmth = Math.max(0, Math.min(100, state.warmthScore + warmthDelta));
  const newTrust = Math.max(0, Math.min(100, state.trustScore + trustDelta));
  const newFamiliarity = Math.max(0, Math.min(100, state.familiarityScore + familiarityDelta));
  const newTotalInteractions = state.totalInteractions + 1;

  // Calculate new bond level
  const newBondLevel = calculateBondLevel(newWarmth, newTrust, newFamiliarity, newTotalInteractions);

  // Update flags
  const newFlags = [...state.flags];
  if (eventType === "grief" && !newFlags.includes("grief_mode")) {
    newFlags.push("grief_mode");
  }
  if (eventType === "burnout" && !newFlags.includes("burnout_watch")) {
    newFlags.push("burnout_watch");
  }

  // Remove grief_mode after 30 days
  if (state.lastInteractionAt) {
    const lastInteraction = new Date(state.lastInteractionAt);
    const daysSince = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30 && newFlags.includes("grief_mode")) {
      newFlags.splice(newFlags.indexOf("grief_mode"), 1);
    }
  }

  // Update database
  await supabaseAdmin
    .from("persona_companion_state")
    .update({
      warmth_score: newWarmth,
      trust_score: newTrust,
      familiarity_score: newFamiliarity,
      total_interactions: newTotalInteractions,
      bond_level: newBondLevel,
      flags: newFlags,
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.id);

  // Log companion event if significant
  if (eventType && ["big_win", "setback", "grief", "arc_milestone"].includes(eventType)) {
    await supabaseAdmin.from("persona_companion_events").insert({
      user_id: dbUserId,
      persona_id: personaId,
      coach_id: coachId || null,
      event_type: eventType,
      title: getEventTitle(eventType),
      description: getEventDescription(eventType, outcomeTag),
      tags: getEventTags(eventType),
    });
  }
}

/**
 * Get event title
 */
function getEventTitle(eventType: string): string {
  const titles: Record<string, string> = {
    big_win: "Big Win Together",
    setback: "Navigated Setback",
    grief: "Supported Through Grief",
    arc_milestone: "Life Arc Milestone",
    first_share: "First Deep Share",
  };
  return titles[eventType] || "Companion Event";
}

/**
 * Get event description
 */
function getEventDescription(eventType: string, outcomeTag?: string): string {
  return `User experienced ${eventType} with ${outcomeTag || "neutral"} outcome`;
}

/**
 * Get event tags
 */
function getEventTags(eventType: string): string[] {
  const tagMap: Record<string, string[]> = {
    big_win: ["win", "celebration"],
    setback: ["challenge", "resilience"],
    grief: ["emotional_support", "crisis"],
    arc_milestone: ["progress", "life_arc"],
    first_share: ["vulnerability", "trust"],
  };
  return tagMap[eventType] || [];
}




