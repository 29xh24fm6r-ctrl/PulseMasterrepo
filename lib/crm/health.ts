// CRM Health Scoring
// lib/crm/health.ts

import { supabaseAdmin } from "@/lib/supabase";
import { RelationshipHealth, DealHealth } from "./types";
import { getInteractions, getLastInteractionForContact } from "./interactions";
import { getDeals } from "./deals";
import { handleAGIEvent } from "@/lib/agi/orchestrator";
import { relationshipSignalTrigger } from "@/lib/agi/triggers";

/**
 * Get relationship health for a contact
 */
export async function getRelationshipHealth(
  userId: string,
  contactId: string
): Promise<RelationshipHealth | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data, error } = await supabaseAdmin
    .from("crm_relationship_health")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .single();

  if (error || !data) return null;
  return mapHealthRow(data);
}

/**
 * Recompute relationship health for all contacts
 */
export async function recomputeRelationshipHealthForUser(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get all contacts
  const { data: contacts } = await supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .eq("user_id", dbUserId);

  if (!contacts) return;

  let atRiskCount = 0;
  let checkinsDueCount = 0;

  for (const contact of contacts) {
    const health = await recomputeRelationshipHealthForContact(userId, contact.id);
    
    // Track at-risk and check-ins due
    if (health.score < 50) {
      atRiskCount++;
    }
    if (health.next_suggested_checkin_at && new Date(health.next_suggested_checkin_at) <= new Date()) {
      checkinsDueCount++;
    }
  }

  // Trigger AGI if significant relationship signals detected
  if (atRiskCount > 0 || checkinsDueCount > 0) {
    try {
      await handleAGIEvent(userId, relationshipSignalTrigger({
        atRiskCount,
        checkinsDue: checkinsDueCount,
      }));
    } catch (agiErr) {
      console.warn("[CRM Health] AGI trigger failed:", agiErr);
    }
  }
}

/**
 * Recompute relationship health for a single contact
 */
export async function recomputeRelationshipHealthForContact(
  userId: string,
  contactId: string
): Promise<RelationshipHealth> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get contact
  const { data: contact } = await supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact) throw new Error("Contact not found");

  // Get interactions
  const interactions = await getInteractions(userId, { contactId });
  const lastInteraction = interactions.length > 0 ? interactions[0] : null;

  // Calculate score
  let score = 70; // Base score

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Count recent interactions
  const recentInteractions = interactions.filter((i) => {
    const occurredAt = new Date(i.occurred_at);
    return occurredAt >= thirtyDaysAgo;
  });

  const olderInteractions = interactions.filter((i) => {
    const occurredAt = new Date(i.occurred_at);
    return occurredAt >= ninetyDaysAgo && occurredAt < thirtyDaysAgo;
  });

  // Boost for recent interactions
  score += Math.min(20, recentInteractions.length * 3);
  score += Math.min(10, olderInteractions.length * 1);

  // Penalty for long silence
  if (lastInteraction) {
    const daysSinceLastContact = Math.floor(
      (now.getTime() - new Date(lastInteraction.occurred_at).getTime()) / (24 * 60 * 60 * 1000)
    );

    const importance = contact.relationship_importance || 1;
    const maxDays = importance >= 4 ? 30 : importance >= 3 ? 60 : 90;

    if (daysSinceLastContact > maxDays) {
      const penalty = Math.min(40, (daysSinceLastContact - maxDays) * 2);
      score -= penalty;
    }
  } else {
    // No interactions at all
    score -= 30;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine momentum
  const existingHealth = await getRelationshipHealth(userId, contactId);
  let momentum = "stable";
  if (existingHealth) {
    if (score > existingHealth.score + 5) momentum = "improving";
    else if (score < existingHealth.score - 5) momentum = "declining";
  } else {
    momentum = score >= 60 ? "stable" : "declining";
  }

  // Calculate next suggested check-in
  let nextSuggestedCheckinAt: string | undefined;
  if (lastInteraction) {
    const importance = contact.relationship_importance || 1;
    const checkInDays = importance >= 4 ? 14 : importance >= 3 ? 30 : 60;
    const nextCheckIn = new Date(lastInteraction.occurred_at);
    nextCheckIn.setDate(nextCheckIn.getDate() + checkInDays);
    nextSuggestedCheckinAt = nextCheckIn.toISOString();
  } else {
    // No interaction - suggest immediate check-in
    nextSuggestedCheckinAt = now.toISOString();
  }

  // Upsert health record
  const healthData: any = {
    user_id: dbUserId,
    contact_id: contactId,
    score,
    last_interaction_at: lastInteraction?.occurred_at || null,
    next_suggested_checkin_at: nextSuggestedCheckinAt,
    momentum,
    updated_at: new Date().toISOString(),
  };

  const { data: health, error } = await supabaseAdmin
    .from("crm_relationship_health")
    .upsert(healthData, {
      onConflict: "user_id,contact_id",
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update relationship health: ${error.message}`);
  return mapHealthRow(health);
}

/**
 * Get deal health for a deal
 */
export async function getDealHealth(userId: string, dealId: string): Promise<DealHealth | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data, error } = await supabaseAdmin
    .from("crm_deal_health")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("deal_id", dealId)
    .single();

  if (error || !data) return null;
  return mapDealHealthRow(data);
}

/**
 * Recompute deal health for all deals
 */
export async function recomputeDealHealthForUser(userId: string): Promise<void> {
  // Get all open deals
  const deals = await getDeals(userId);
  const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));

  for (const deal of openDeals) {
    await recomputeDealHealthForDeal(userId, deal.id);
  }
}

/**
 * Recompute deal health for a single deal
 */
export async function recomputeDealHealthForDeal(
  userId: string,
  dealId: string
): Promise<DealHealth> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get deal
  const { data: deal } = await supabaseAdmin
    .from("crm_deals")
    .select("*")
    .eq("id", dealId)
    .single();

  if (!deal) throw new Error("Deal not found");

  // Get interactions
  const interactions = await getInteractions(userId, { dealId });
  const lastInteraction = interactions.length > 0 ? interactions[0] : null;

  // Calculate score
  let score = 60; // Base score

  const now = new Date();
  const dealUpdatedAt = new Date(deal.updated_at);
  const daysSinceStageUpdate = Math.floor(
    (now.getTime() - dealUpdatedAt.getTime()) / (24 * 60 * 60 * 1000)
  );

  // Boost for later stages
  const stageScores: Record<string, number> = {
    lead: 0,
    qualified: 10,
    proposal: 20,
    negotiation: 30,
  };
  score += stageScores[deal.stage] || 0;

  // Boost for recent interactions
  if (lastInteraction) {
    const daysSinceLastInteraction = Math.floor(
      (now.getTime() - new Date(lastInteraction.occurred_at).getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceLastInteraction <= 7) score += 15;
    else if (daysSinceLastInteraction <= 14) score += 10;
    else if (daysSinceLastInteraction <= 30) score += 5;
  }

  // Penalty for stalled deals
  if (daysSinceStageUpdate > 30) {
    const penalty = Math.min(30, (daysSinceStageUpdate - 30) * 1);
    score -= penalty;
  }

  // Penalty for past close date
  if (deal.close_date) {
    const closeDate = new Date(deal.close_date);
    if (closeDate < now && !["won", "lost"].includes(deal.stage)) {
      const daysPast = Math.floor((now.getTime() - closeDate.getTime()) / (24 * 60 * 60 * 1000));
      score -= Math.min(40, daysPast * 2);
    }
  }

  // Penalty for no interactions
  if (!lastInteraction) {
    score -= 20;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Calculate risk level (1-5)
  let riskLevel = 1;
  if (score < 30) riskLevel = 5;
  else if (score < 50) riskLevel = 4;
  else if (score < 70) riskLevel = 3;
  else if (score < 85) riskLevel = 2;

  // Calculate days stalled
  const daysStalled = daysSinceStageUpdate > 30 ? daysSinceStageUpdate : null;

  // Upsert health record
  const healthData: any = {
    user_id: dbUserId,
    deal_id: dealId,
    score,
    risk_level: riskLevel,
    last_interaction_at: lastInteraction?.occurred_at || null,
    days_stalled: daysStalled,
    updated_at: new Date().toISOString(),
  };

  const { data: health, error } = await supabaseAdmin
    .from("crm_deal_health")
    .upsert(healthData, {
      onConflict: "user_id,deal_id",
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update deal health: ${error.message}`);
  return mapDealHealthRow(health);
}

/**
 * Map database row to RelationshipHealth
 */
function mapHealthRow(row: any): RelationshipHealth {
  return {
    id: row.id,
    user_id: row.user_id,
    contact_id: row.contact_id,
    score: row.score,
    last_interaction_at: row.last_interaction_at,
    next_suggested_checkin_at: row.next_suggested_checkin_at,
    momentum: row.momentum,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Map database row to DealHealth
 */
function mapDealHealthRow(row: any): DealHealth {
  return {
    id: row.id,
    user_id: row.user_id,
    deal_id: row.deal_id,
    score: row.score,
    risk_level: row.risk_level,
    last_interaction_at: row.last_interaction_at,
    days_stalled: row.days_stalled,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}


