// Relationship Detector - Uses Relationship Radar
// lib/autopilot/detectors/relationships.ts

import { supabaseAdmin } from "@/lib/supabase";
import { AutopilotCandidate } from "../types";

/**
 * Detect relationships needing touch
 */
export async function detectRelationshipActions(
  userId: string
): Promise<AutopilotCandidate[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const candidates: AutopilotCandidate[] = [];

  // Find contacts with high risk or long silence
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get contacts with relationship scores
  const { data: relationships } = await supabaseAdmin
    .from("contact_relationship_scores")
    .select("contact_id, trust_score, influence_score, last_interaction_at")
    .eq("user_id", dbUserId)
    .limit(100);

  if (!relationships || relationships.length === 0) {
    return candidates;
  }

  for (const rel of relationships) {
    const trust = rel.trust_score || 0;
    const influence = rel.influence_score || 0;
    const lastInteraction = rel.last_interaction_at
      ? new Date(rel.last_interaction_at)
      : null;

    const daysSinceInteraction = lastInteraction
      ? Math.floor((Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // High risk if high trust/influence but long silence
    let riskLevel: "low" | "medium" | "high" = "low";
    if (
      (trust > 0.7 || influence > 0.7) &&
      (daysSinceInteraction === null || daysSinceInteraction > 30)
    ) {
      riskLevel = "high";
    } else if (
      (trust > 0.5 || influence > 0.5) &&
      (daysSinceInteraction === null || daysSinceInteraction > 14)
    ) {
      riskLevel = "medium";
    }

    if (riskLevel !== "low") {
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("id, name")
        .eq("id", rel.contact_id)
        .single();

      if (contact) {
        candidates.push({
          type: "relationship_checkin",
          riskLevel,
          context: {
            contact_id: contact.id,
            contact_name: contact.name,
            trust_score: trust,
            influence_score: influence,
            days_since_interaction: daysSinceInteraction,
          },
          summary: `Relationship check-in: ${contact.name} (${daysSinceInteraction !== null ? `${daysSinceInteraction} days` : "never"} since last interaction)`,
        });
      }
    }
  }

  return candidates;
}




