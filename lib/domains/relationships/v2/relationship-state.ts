// Relationship State Model
// lib/domains/relationships/v2/relationship-state.ts

import { supabaseAdmin } from "@/lib/supabase";
import { RelationshipState } from "./types";
// Note: Will import from longitudinal when available

/**
 * Build relationship state for a person
 */
export async function buildRelationshipState(
  userId: string,
  personId: string
): Promise<RelationshipState | null> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Get contact data
    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id, name, relationship_score, last_interaction_at")
      .eq("user_id", dbUserId)
      .eq("id", personId)
      .maybeSingle();

    if (!contact) return null;

    // Calculate days since interaction
    const lastContact = contact.last_interaction_at
      ? new Date(contact.last_interaction_at)
      : null;
    const daysSince = lastContact
      ? Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Determine frequency pattern
    const frequencyPattern = inferFrequencyPattern(daysSince);

    // Load relationship history from third_brain_events
    const { data: events } = await supabaseAdmin
      .from("third_brain_events")
      .select("id, type, occurred_at, raw_payload")
      .eq("user_id", dbUserId)
      .or(`raw_payload->>contactId.eq.${personId},raw_payload->>personId.eq.${personId}`)
      .order("occurred_at", { ascending: false })
      .limit(50);

    const relationshipEvents = (events || []).map((e) => ({
      id: e.id,
      timestamp: e.occurred_at,
      domain: "relationships" as const,
      type: e.type,
      description: e.type,
      metadata: e.raw_payload || {},
    }));

    // Determine emotional association
    const emotionalAssociation = inferEmotionalAssociation(relationshipEvents);

    // Calculate scores (will be enhanced by analyzer)
    const importanceScore = contact.relationship_score || 50;
    const riskScore = calculateRiskScore(daysSince, importanceScore);
    const opportunityScore = calculateOpportunityScore(daysSince, relationshipEvents);

    return {
      personId: contact.id,
      personName: contact.name,
      lastContact: contact.last_interaction_at,
      frequencyPattern,
      emotionalAssociation,
      importanceScore,
      riskScore,
      opportunityScore,
      history: relationshipEvents,
      relationshipScore: contact.relationship_score || 0,
      daysSinceInteraction: daysSince,
    };
  } catch (err) {
    console.error("[RelationshipState] Failed to build state:", err);
    return null;
  }
}

/**
 * Infer frequency pattern from days since interaction
 */
function inferFrequencyPattern(daysSince: number): RelationshipState["frequencyPattern"] {
  if (daysSince <= 1) return "daily";
  if (daysSince <= 7) return "weekly";
  if (daysSince <= 30) return "monthly";
  if (daysSince <= 90) return "quarterly";
  return "irregular";
}

/**
 * Infer emotional association from events
 */
function inferEmotionalAssociation(
  events: Array<{ emotion?: string; intensity?: number }>
): RelationshipState["emotionalAssociation"] {
  if (events.length === 0) return null;

  const positiveEmotions = ["happy", "excited", "grateful", "confident"];
  const negativeEmotions = ["stressed", "sad", "anxious", "angry"];

  const positiveCount = events.filter(
    (e) => e.emotion && positiveEmotions.includes(e.emotion)
  ).length;
  const negativeCount = events.filter(
    (e) => e.emotion && negativeEmotions.includes(e.emotion)
  ).length;

  if (positiveCount > negativeCount * 1.5) return "positive";
  if (negativeCount > positiveCount * 1.5) return "negative";
  return "neutral";
}

/**
 * Calculate risk score
 */
function calculateRiskScore(daysSince: number, importanceScore: number): number {
  // Higher risk if important relationship + long time since contact
  if (importanceScore > 70 && daysSince > 30) return 80;
  if (importanceScore > 50 && daysSince > 60) return 60;
  if (daysSince > 90) return 40;
  return Math.min(30, daysSince / 3);
}

/**
 * Calculate opportunity score
 */
function calculateOpportunityScore(
  daysSince: number,
  events: Array<{ type: string; timestamp: string }>
): number {
  // Higher opportunity if recent events suggest engagement
  const recentEvents = events.filter(
    (e) => new Date(e.timestamp).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
  );

  if (recentEvents.length > 0 && daysSince < 14) return 70; // Active relationship
  if (daysSince > 30 && daysSince < 60) return 50; // Reconnection window
  if (daysSince > 60) return 30; // Long-term reconnection opportunity
  return 20;
}

/**
 * Load life events (helper to access longitudinal data)
 */
async function loadLifeEvents(userId: string) {
  // This will be imported from longitudinal module
  // For now, return empty array
  return [];
}

