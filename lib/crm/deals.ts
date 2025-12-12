// CRM Deals
// lib/crm/deals.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CrmDeal, CrmDealWithHealth } from "./types";
import { getDealHealth } from "./health";

/**
 * Get deals for a user
 */
export async function getDeals(
  userId: string,
  filters?: {
    stage?: string;
    pipeline?: string;
    search?: string;
  }
): Promise<CrmDealWithHealth[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("crm_deals")
    .select("*")
    .eq("owner_user_id", userId) // Use Clerk userId directly for tenant isolation
    .order("updated_at", { ascending: false });

  if (filters?.stage) {
    query = query.eq("stage", filters.stage);
  }

  if (filters?.pipeline) {
    query = query.eq("pipeline", filters.pipeline);
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch deals: ${error.message}`);

  // Enrich with health data
  const deals = (data || []).map(mapDealRow);
  const dealsWithHealth: CrmDealWithHealth[] = [];

  for (const deal of deals) {
    const health = await getDealHealth(userId, deal.id);
    dealsWithHealth.push({
      ...deal,
      health: health ? {
        score: health.score,
        risk_level: health.risk_level,
        last_interaction_at: health.last_interaction_at,
        days_stalled: health.days_stalled,
      } : undefined,
    });
  }

  return dealsWithHealth;
}

/**
 * Upsert a deal
 */
export async function upsertDeal(
  userId: string,
  data: {
    id?: string;
    name: string;
    stage: string;
    amount?: number;
    currency?: string;
    closeDate?: string;
    probability?: number;
    source?: string;
    primaryContactId?: string;
    organizationId?: string;
    pipeline?: string;
    tags?: string[];
  }
): Promise<CrmDeal> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const dealData: any = {
    owner_user_id: userId, // Use Clerk userId directly for tenant isolation
    user_id: dbUserId, // Keep for backward compatibility if needed
    name: data.name,
    stage: data.stage,
    amount: data.amount || null,
    currency: data.currency || "USD",
    close_date: data.closeDate || null,
    probability: data.probability || 0,
    source: data.source || null,
    primary_contact_id: data.primaryContactId || null,
    organization_id: data.organizationId || null,
    pipeline: data.pipeline || "default",
    tags: data.tags || [],
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    // Update existing
    const { data: updated, error } = await supabaseAdmin
      .from("crm_deals")
      .update(dealData)
      .eq("id", data.id)
      .eq("owner_user_id", userId) // Enforce tenant isolation
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update deal: ${error.message}`);
    return mapDealRow(updated);
  } else {
    // Create new
    const { data: created, error } = await supabaseAdmin
      .from("crm_deals")
      .insert(dealData)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create deal: ${error.message}`);
    return mapDealRow(created);
  }
}

/**
 * Get a single deal by ID
 */
export async function getDealById(userId: string, dealId: string): Promise<CrmDealWithHealth | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data, error } = await supabaseAdmin
    .from("crm_deals")
    .select("*")
    .eq("id", dealId)
    .eq("user_id", dbUserId)
    .single();

  if (error || !data) return null;

  const deal = mapDealRow(data);
  const health = await getDealHealth(userId, dealId);

  return {
    ...deal,
    health: health ? {
      score: health.score,
      risk_level: health.risk_level,
      last_interaction_at: health.last_interaction_at,
      days_stalled: health.days_stalled,
    } : undefined,
  };
}

/**
 * Add a contact to a deal
 */
export async function addContactToDeal(
  userId: string,
  dealId: string,
  contactId: string,
  role?: string
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { error } = await supabaseAdmin
    .from("crm_deal_contacts")
    .upsert({
      user_id: dbUserId,
      deal_id: dealId,
      contact_id: contactId,
      role: role || null,
    }, {
      onConflict: "user_id,deal_id,contact_id",
    });

  if (error) throw new Error(`Failed to add contact to deal: ${error.message}`);
}

/**
 * Map database row to CrmDeal
 */
function mapDealRow(row: any): CrmDeal {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    stage: row.stage,
    amount: row.amount ? parseFloat(row.amount) : undefined,
    currency: row.currency || "USD",
    close_date: row.close_date,
    probability: row.probability || 0,
    source: row.source,
    tags: row.tags || [],
    primary_contact_id: row.primary_contact_id,
    organization_id: row.organization_id,
    pipeline: row.pipeline || "default",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}




