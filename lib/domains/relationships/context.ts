// Relationships Domain Context Builder
// lib/domains/relationships/context.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PulseDomainContext } from "@/lib/cortex/types";

/**
 * Build relationships domain context for Cortex
 */
export async function buildRelationshipsDomainContext(
  userId: string
): Promise<PulseDomainContext["relationships"]> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Get key people (contacts with relationship score > 50)
    const { data: contacts } = await supabaseAdmin
      .from("contacts")
      .select("id, name, relationship_score, last_interaction_at")
      .eq("user_id", dbUserId)
      .gt("relationship_score", 50)
      .order("relationship_score", { ascending: false })
      .limit(20);

    const now = Date.now();
    const keyPeople =
      contacts?.map((c) => {
        const lastInteraction = c.last_interaction_at
          ? new Date(c.last_interaction_at).getTime()
          : null;
        const daysSince = lastInteraction
          ? Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24))
          : 999;

        return {
          id: c.id,
          name: c.name,
          relationshipScore: c.relationship_score || 0,
          lastInteractionAt: c.last_interaction_at || undefined,
          daysSinceInteraction: daysSince,
        };
      }) || [];

    // Calculate health scores
    const healthScores = keyPeople.map((person) => {
      let trend: "warming" | "stable" | "cooling" | "gone_quiet" = "stable";
      if (person.daysSinceInteraction > 30) {
        trend = "gone_quiet";
      } else if (person.daysSinceInteraction > 14) {
        trend = "cooling";
      } else if (person.daysSinceInteraction < 7) {
        trend = "warming";
      }

      return {
        contactId: person.id,
        score: person.relationshipScore,
        trend,
      };
    });

    // Get upcoming interactions (from calendar or scheduled calls)
    // TODO: Integrate with calendar system
    const upcomingInteractions: PulseDomainContext["relationships"]["upcomingInteractions"] = [];

    return {
      keyPeople,
      healthScores,
      upcomingInteractions,
    };
  } catch (err) {
    console.warn("[RelationshipsDomain] Failed to build context:", err);
    return {
      keyPeople: [],
      healthScores: [],
      upcomingInteractions: [],
    };
  }
}



