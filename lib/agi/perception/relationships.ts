// Relationship Perception v2
// lib/agi/perception/relationships.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface RelationshipSummary {
  id: string;
  name: string;
  email?: string;
  category: "family" | "friend" | "partner" | "work" | "client" | "network" | "mentor";
  lastInteractionAt?: string;
  daysSinceInteraction: number;
  relationshipScore?: number;
  importanceLevel: "low" | "medium" | "high" | "critical";
  driftScore: number; // 0-1, higher = more drift
}

export interface RelationshipPerception {
  importantContacts: RelationshipSummary[];
  atRiskRelationships: RelationshipSummary[];
  checkinsDue: RelationshipSummary[];
}

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

/**
 * Calculate relationship drift score
 */
function calculateDriftScore(
  daysSinceInteraction: number,
  typicalCadence: number = 30
): number {
  if (daysSinceInteraction === 0) return 0;
  if (daysSinceInteraction <= typicalCadence) return 0;

  // Drift increases as days exceed typical cadence
  const excessDays = daysSinceInteraction - typicalCadence;
  return Math.min(1, excessDays / (typicalCadence * 2)); // Max drift at 2x cadence
}

/**
 * Build relationship perception for user
 */
export async function buildRelationshipPerception(userId: string): Promise<RelationshipPerception> {
  const dbUserId = await resolveUserId(userId);

  const perception: RelationshipPerception = {
    importantContacts: [],
    atRiskRelationships: [],
    checkinsDue: [],
  };

  try {
    // Get contacts from CRM
    const { data: contacts } = await supabaseAdmin
      .from("crm_contacts")
      .select(
        `
        id,
        name,
        email,
        category,
        importance_score,
        last_interaction_at,
        crm_relationship_health (
          score,
          last_interaction_at
        )
      `
      )
      .eq("user_id", dbUserId)
      .order("importance_score", { ascending: false })
      .limit(100);

    if (!contacts || contacts.length === 0) {
      return perception;
    }

    const now = Date.now();
    const relationships: RelationshipSummary[] = [];

    for (const contact of contacts) {
      const health = (contact.crm_relationship_health as any)?.[0];
      const lastInteractionAt = health?.last_interaction_at || contact.last_interaction_at;
      const daysSinceInteraction = lastInteractionAt
        ? Math.floor((now - new Date(lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const relationshipScore = health?.score || contact.importance_score || 50;
      const importanceLevel =
        relationshipScore >= 80
          ? "critical"
          : relationshipScore >= 60
          ? "high"
          : relationshipScore >= 40
          ? "medium"
          : "low";

      // Typical cadence varies by category
      const typicalCadence: Record<string, number> = {
        family: 7,
        partner: 1,
        friend: 14,
        work: 7,
        client: 3,
        network: 30,
        mentor: 14,
      };

      const driftScore = calculateDriftScore(
        daysSinceInteraction,
        typicalCadence[contact.category || "network"] || 30
      );

      const relationship: RelationshipSummary = {
        id: contact.id,
        name: contact.name || "Unknown",
        email: contact.email,
        category: (contact.category as RelationshipSummary["category"]) || "network",
        lastInteractionAt,
        daysSinceInteraction,
        relationshipScore,
        importanceLevel,
        driftScore,
      };

      relationships.push(relationship);
    }

    // Categorize relationships
    for (const rel of relationships) {
      // Important contacts (high score or critical importance)
      if (rel.importanceLevel === "critical" || rel.importanceLevel === "high") {
        perception.importantContacts.push(rel);
      }

      // At-risk relationships (high drift + high importance)
      if (rel.driftScore > 0.5 && rel.importanceLevel !== "low") {
        perception.atRiskRelationships.push(rel);
      }

      // Check-ins due (important + no interaction in typical cadence)
      const typicalCadence: Record<string, number> = {
        family: 7,
        partner: 1,
        friend: 14,
        work: 7,
        client: 3,
        network: 30,
        mentor: 14,
      };
      const cadence = typicalCadence[rel.category] || 30;

      if (
        rel.importanceLevel !== "low" &&
        rel.daysSinceInteraction >= cadence &&
        rel.daysSinceInteraction < cadence * 2
      ) {
        perception.checkinsDue.push(rel);
      }
    }

    // Sort by importance and recency
    perception.importantContacts.sort((a, b) => {
      const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return importanceOrder[b.importanceLevel] - importanceOrder[a.importanceLevel];
    });

    perception.atRiskRelationships.sort((a, b) => b.driftScore - a.driftScore);

    perception.checkinsDue.sort((a, b) => a.daysSinceInteraction - b.daysSinceInteraction);
  } catch (err: any) {
    console.warn("[Relationship Perception] Failed to build perception:", err.message);
  }

  return perception;
}



