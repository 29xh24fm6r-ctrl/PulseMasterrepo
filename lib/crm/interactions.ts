// CRM Interactions
// lib/crm/interactions.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CrmInteraction } from "./types";

/**
 * Log an interaction
 */
export async function logInteraction(
  userId: string,
  data: {
    contactId?: string;
    dealId?: string;
    type: string;
    channel?: string;
    occurredAt: string;
    subject?: string;
    summary?: string;
    sentiment?: string;
    importance?: number;
  }
): Promise<CrmInteraction> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const interactionData: any = {
    user_id: dbUserId,
    contact_id: data.contactId || null,
    deal_id: data.dealId || null,
    type: data.type,
    channel: data.channel || null,
    occurred_at: data.occurredAt,
    subject: data.subject || null,
    summary: data.summary || null,
    sentiment: data.sentiment || null,
    importance: data.importance || 1,
  };

  const { data: created, error } = await supabaseAdmin
    .from("crm_interactions")
    .insert(interactionData)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to log interaction: ${error.message}`);
  return mapInteractionRow(created);
}

/**
 * Get interactions for a user
 */
export async function getInteractions(
  userId: string,
  filters?: {
    contactId?: string;
    dealId?: string;
    limit?: number;
  }
): Promise<CrmInteraction[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("crm_interactions")
    .select("*")
    .eq("user_id", dbUserId)
    .order("occurred_at", { ascending: false });

  if (filters?.contactId) {
    query = query.eq("contact_id", filters.contactId);
  }

  if (filters?.dealId) {
    query = query.eq("deal_id", filters.dealId);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch interactions: ${error.message}`);
  return (data || []).map(mapInteractionRow);
}

/**
 * Get last interaction for a contact
 */
export async function getLastInteractionForContact(
  userId: string,
  contactId: string
): Promise<CrmInteraction | null> {
  const interactions = await getInteractions(userId, { contactId, limit: 1 });
  return interactions.length > 0 ? interactions[0] : null;
}

/**
 * Map database row to CrmInteraction
 */
function mapInteractionRow(row: any): CrmInteraction {
  return {
    id: row.id,
    user_id: row.user_id,
    contact_id: row.contact_id,
    deal_id: row.deal_id,
    type: row.type,
    channel: row.channel,
    occurred_at: row.occurred_at,
    subject: row.subject,
    summary: row.summary,
    sentiment: row.sentiment,
    importance: row.importance || 1,
    created_at: row.created_at,
  };
}




