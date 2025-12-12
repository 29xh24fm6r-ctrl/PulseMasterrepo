// CRM Organizations
// lib/crm/organizations.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CrmOrganization } from "./types";

/**
 * Get organizations for a user
 */
export async function getOrganizations(
  userId: string,
  filters?: {
    search?: string;
    limit?: number;
  }
): Promise<CrmOrganization[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("crm_organizations")
    .select("*")
    .eq("user_id", dbUserId)
    .order("name", { ascending: true });

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);
  return (data || []).map(mapOrgRow);
}

/**
 * Upsert an organization
 */
export async function upsertOrganization(
  userId: string,
  data: {
    id?: string;
    name: string;
    industry?: string;
    website?: string;
    size?: string;
    tags?: string[];
  }
): Promise<CrmOrganization> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const orgData: any = {
    user_id: dbUserId,
    name: data.name,
    industry: data.industry || null,
    website: data.website || null,
    size: data.size || null,
    tags: data.tags || [],
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    // Update existing
    const { data: updated, error } = await supabaseAdmin
      .from("crm_organizations")
      .update(orgData)
      .eq("id", data.id)
      .eq("user_id", dbUserId)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update organization: ${error.message}`);
    return mapOrgRow(updated);
  } else {
    // Create new
    const { data: created, error } = await supabaseAdmin
      .from("crm_organizations")
      .insert(orgData)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create organization: ${error.message}`);
    return mapOrgRow(created);
  }
}

/**
 * Link a contact to an organization
 */
export async function linkContactToOrganization(
  userId: string,
  contactId: string,
  organizationId: string,
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
    .from("crm_contact_org_links")
    .upsert({
      user_id: dbUserId,
      contact_id: contactId,
      organization_id: organizationId,
      role: role || null,
    }, {
      onConflict: "user_id,contact_id,organization_id",
    });

  if (error) throw new Error(`Failed to link contact to organization: ${error.message}`);
}

/**
 * Map database row to CrmOrganization
 */
function mapOrgRow(row: any): CrmOrganization {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    industry: row.industry,
    website: row.website,
    size: row.size,
    tags: row.tags || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}




