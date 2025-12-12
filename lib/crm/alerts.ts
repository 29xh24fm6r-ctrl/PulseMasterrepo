// CRM Alerts Engine
// lib/crm/alerts.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CrmAlert } from "./types";
import { getRelationshipRadar } from "./radar";
import { getDeals } from "./deals";
import { getContacts } from "./contacts";
import { getRelationshipHealth } from "./health";
import { getLastInteractionForContact } from "./interactions";

/**
 * Run CRM alerts for a user
 */
export async function runCrmAlertsForUser(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Check for recent similar alerts (prevent spam)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAlerts } = await supabaseAdmin
    .from("crm_alerts")
    .select("type, contact_id, deal_id")
    .eq("user_id", dbUserId)
    .gte("created_at", oneDayAgo);

  const recentAlertKeys = new Set(
    (recentAlerts || []).map((a) => `${a.type}:${a.contact_id || ""}:${a.deal_id || ""}`)
  );

  const alerts: Array<{
    type: string;
    contact_id?: string;
    deal_id?: string;
    title: string;
    body: string;
    severity: number;
    is_positive: boolean;
  }> = [];

  // Relationship at risk alerts
  const radarItems = await getRelationshipRadar(userId, 20);
  for (const item of radarItems) {
    if (item.healthScore < 40 && item.importance >= 4) {
      const key = `relationship_at_risk:${item.contactId}:`;
      if (!recentAlertKeys.has(key)) {
        alerts.push({
          type: "relationship_at_risk",
          contact_id: item.contactId,
          title: `Relationship at risk: ${item.fullName}`,
          body: `Your relationship with ${item.fullName} may need attention. ${item.reason}.`,
          severity: item.importance >= 5 ? 4 : 3,
          is_positive: false,
        });
        recentAlertKeys.add(key);
      }
    }
  }

  // VIP neglect alerts
  const contacts = await getContacts(userId);
  for (const contact of contacts) {
    if (contact.tags.includes("vip") || contact.tags.includes("referral_source")) {
      const lastInteraction = await getLastInteractionForContact(userId, contact.id);
      const now = new Date();
      let daysSince = 0;

      if (lastInteraction) {
        daysSince = Math.floor(
          (now.getTime() - new Date(lastInteraction.occurred_at).getTime()) / (24 * 60 * 60 * 1000)
        );
      } else {
        // No interactions ever
        const created = new Date(contact.created_at);
        daysSince = Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
      }

      if (daysSince > 30) {
        const key = `vip_neglect:${contact.id}:`;
        if (!recentAlertKeys.has(key)) {
          alerts.push({
            type: "vip_neglect",
            contact_id: contact.id,
            title: `VIP contact needs attention: ${contact.full_name}`,
            body: `You haven't contacted ${contact.full_name} in ${daysSince} days. This might be a good time to check in.`,
            severity: daysSince > 60 ? 4 : 3,
            is_positive: false,
          });
          recentAlertKeys.add(key);
        }
      }
    }
  }

  // Deal stalled alerts
  const deals = await getDeals(userId);
  const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  for (const deal of openDeals) {
    if (deal.health && deal.health.risk_level >= 4) {
      const key = `deal_stalled:${deal.id}:`;
      if (!recentAlertKeys.has(key)) {
        const daysStalled = deal.health.days_stalled || 0;
        alerts.push({
          type: "deal_stalled",
          deal_id: deal.id,
          title: `Deal at risk: ${deal.name}`,
          body: `The deal "${deal.name}" may be stalled. ${daysStalled > 0 ? `No movement in ${daysStalled} days.` : "Consider following up."}`,
          severity: deal.health.risk_level,
          is_positive: false,
        });
        recentAlertKeys.add(key);
      }
    }
  }

  // Positive momentum alerts (less frequent)
  for (const deal of openDeals) {
    if (deal.health && deal.health.score >= 80 && deal.stage !== "lead") {
      // Check if recently advanced stages
      const updatedAt = new Date(deal.updated_at);
      const now = new Date();
      const daysSinceUpdate = Math.floor(
        (now.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysSinceUpdate <= 7) {
        const key = `positive_momentum:${deal.id}:`;
        if (!recentAlertKeys.has(key)) {
          alerts.push({
            type: "positive_momentum",
            deal_id: deal.id,
            title: `Deal progressing: ${deal.name}`,
            body: `Great progress on "${deal.name}"! The deal is in ${deal.stage} stage with strong health.`,
            severity: 2,
            is_positive: true,
          });
          recentAlertKeys.add(key);
        }
      }
    }
  }

  // Insert alerts
  for (const alert of alerts) {
    await supabaseAdmin.from("crm_alerts").insert({
      user_id: dbUserId,
      ...alert,
    });
  }
}

/**
 * Get CRM alerts for a user
 */
export async function getCrmAlerts(
  userId: string,
  options?: {
    limit?: number;
    dismissed?: boolean;
  }
): Promise<CrmAlert[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("crm_alerts")
    .select("*")
    .eq("user_id", dbUserId)
    .order("created_at", { ascending: false });

  if (options?.dismissed === false) {
    query = query.is("dismissed_at", null);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch CRM alerts: ${error.message}`);
  return (data || []).map(mapAlertRow);
}

/**
 * Mark alert as seen
 */
export async function markAlertSeen(userId: string, alertId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { error } = await supabaseAdmin
    .from("crm_alerts")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("user_id", dbUserId);

  if (error) throw new Error(`Failed to mark alert as seen: ${error.message}`);
}

/**
 * Dismiss alert
 */
export async function dismissAlert(userId: string, alertId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { error } = await supabaseAdmin
    .from("crm_alerts")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("user_id", dbUserId);

  if (error) throw new Error(`Failed to dismiss alert: ${error.message}`);
}

/**
 * Map database row to CrmAlert
 */
function mapAlertRow(row: any): CrmAlert {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    contact_id: row.contact_id,
    deal_id: row.deal_id,
    title: row.title,
    body: row.body,
    severity: row.severity,
    is_positive: row.is_positive,
    created_at: row.created_at,
    seen_at: row.seen_at,
    dismissed_at: row.dismissed_at,
  };
}




