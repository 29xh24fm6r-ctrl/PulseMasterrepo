// CRM Contacts
// lib/crm/contacts.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CrmContact } from "./types";

/**
 * Get contacts for a user
 */
export async function getContacts(
  userId: string,
  filters?: {
    type?: string;
    search?: string;
    tag?: string;
    limit?: number;
  }
): Promise<CrmContact[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .eq("owner_user_id", userId) // Use Clerk userId directly for tenant isolation
    .eq("status", "active") // Only show active (non-merged) contacts
    .order("updated_at", { ascending: false });

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  if (filters?.tag) {
    query = query.contains("tags", [filters.tag]);
  }

  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,primary_email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
    );
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
  return (data || []).map(mapContactRow);
}

/**
 * Upsert a contact
 */
export async function upsertContact(
  userId: string,
  data: {
    id?: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    companyName?: string;
    title?: string;
    type?: string;
    tags?: string[];
    importance?: number;
  }
): Promise<CrmContact> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

    const contactData: any = {
      owner_user_id: userId, // Use Clerk userId directly for tenant isolation
      user_id: dbUserId, // Keep for backward compatibility if needed
    full_name: data.fullName,
    first_name: data.firstName || null,
    last_name: data.lastName || null,
    nickname: data.nickname || null,
    primary_email: data.primaryEmail || null,
    primary_phone: data.primaryPhone || null,
    company_name: data.companyName || null,
    title: data.title || null,
    type: data.type || null,
    tags: data.tags || [],
    relationship_importance: data.importance || 1,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    // Update existing
    const { data: updated, error } = await supabaseAdmin
      .from("crm_contacts")
      .update(contactData)
      .eq("id", data.id)
      .eq("owner_user_id", userId) // Enforce tenant isolation
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update contact: ${error.message}`);
    return mapContactRow(updated);
  } else {
    // Create new - check for duplicates by email
    if (data.primaryEmail) {
      const { data: existing } = await supabaseAdmin
        .from("crm_contacts")
        .select("*")
        .eq("owner_user_id", userId) // Enforce tenant isolation
        .eq("primary_email", data.primaryEmail)
        .single();

      if (existing) {
        // Update existing instead
        const { data: updated, error } = await supabaseAdmin
          .from("crm_contacts")
          .update(contactData)
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error) throw new Error(`Failed to update contact: ${error.message}`);
        return mapContactRow(updated);
      }
    }

    // Create new
    const { data: created, error } = await supabaseAdmin
      .from("crm_contacts")
      .insert(contactData)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create contact: ${error.message}`);
    return mapContactRow(created);
  }
}

/**
 * Get a single contact by ID
 */
export async function getContactById(userId: string, contactId: string): Promise<CrmContact | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data, error } = await supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .eq("id", contactId)
    .eq("owner_user_id", userId) // Enforce tenant isolation
    .eq("status", "active") // Only return active contacts
    .single();

  if (error || !data) return null;
  return mapContactRow(data);
}

/**
 * Map database row to CrmContact
 */
function mapContactRow(row: any): CrmContact {
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    first_name: row.first_name,
    last_name: row.last_name,
    nickname: row.nickname,
    primary_email: row.primary_email,
    primary_phone: row.primary_phone,
    company_name: row.company_name,
    title: row.title,
    type: row.type,
    tags: row.tags || [],
    timezone: row.timezone,
    relationship_importance: row.relationship_importance || 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}




