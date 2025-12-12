// Relationship Radar
// lib/crm/radar.ts

import { RelationshipRadarItem } from "./types";
import { getContacts } from "./contacts";
import { getRelationshipHealth } from "./health";
import { getDeals } from "./deals";
import { getLastInteractionForContact } from "./interactions";

/**
 * Get Relationship Radar - "Who matters now?"
 */
export async function getRelationshipRadar(
  userId: string,
  limit = 10
): Promise<RelationshipRadarItem[]> {
  // Get all contacts with health scores
  const contacts = await getContacts(userId);
  const radarItems: RelationshipRadarItem[] = [];

  for (const contact of contacts) {
    const health = await getRelationshipHealth(userId, contact.id);
    if (!health) continue;

    const lastInteraction = await getLastInteractionForContact(userId, contact.id);
    const now = new Date();

    // Determine reason for being on radar
    let reason = "";
    let shouldInclude = false;

    // High importance, low health
    if (contact.relationship_importance >= 4 && health.score < 50) {
      reason = `VIP with relationship health at ${health.score}`;
      shouldInclude = true;
    }

    // Overdue check-in
    if (health.next_suggested_checkin_at) {
      const nextCheckIn = new Date(health.next_suggested_checkin_at);
      if (nextCheckIn <= now) {
        reason = `Overdue check-in (suggested ${Math.floor((now.getTime() - nextCheckIn.getTime()) / (24 * 60 * 60 * 1000))} days ago)`;
        shouldInclude = true;
      }
    }

    // VIP with no recent contact
    if (contact.tags.includes("vip") || contact.tags.includes("referral_source")) {
      if (lastInteraction) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastInteraction.occurred_at).getTime()) / (24 * 60 * 60 * 1000)
        );
        if (daysSince > 30) {
          reason = `VIP, no contact for ${daysSince} days`;
          shouldInclude = true;
        }
      } else {
        reason = "VIP with no recorded interactions";
        shouldInclude = true;
      }
    }

    // Declining momentum
    if (health.momentum === "declining" && contact.relationship_importance >= 3) {
      reason = `Relationship declining (score: ${health.score})`;
      shouldInclude = true;
    }

    // Contacts tied to active deals
    const deals = await getDeals(userId);
    const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
    const hasActiveDeal = activeDeals.some(
      (d) => d.primary_contact_id === contact.id
    );

    if (hasActiveDeal && health.score < 60) {
      reason = `Active deal contact with low relationship health`;
      shouldInclude = true;
    }

    if (shouldInclude) {
      radarItems.push({
        contactId: contact.id,
        fullName: contact.full_name,
        importance: contact.relationship_importance,
        healthScore: health.score,
        momentum: health.momentum,
        lastInteractionAt: lastInteraction?.occurred_at,
        nextSuggestedCheckinAt: health.next_suggested_checkin_at,
        reason,
      });
    }
  }

  // Sort by priority (importance + urgency)
  radarItems.sort((a, b) => {
    // Higher importance first
    if (a.importance !== b.importance) {
      return b.importance - a.importance;
    }
    // Lower health score = more urgent
    return a.healthScore - b.healthScore;
  });

  return radarItems.slice(0, limit);
}




