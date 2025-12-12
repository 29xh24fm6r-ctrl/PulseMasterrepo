/**
 * Deduplication Utilities
 * Helps identify and merge duplicate entities
 * lib/organism/dedupe.ts
 */

import { supabaseServer } from "@/lib/supabase/server";

export interface DuplicateContact {
  owner_user_id: string;
  email: string;
  duplicate_count: number;
  contact_ids: string[];
  names: string[];
  created_dates: string[];
}

export interface DuplicateOrganization {
  owner_user_id: string;
  domain: string;
  duplicate_count: number;
  org_ids: string[];
  names: string[];
}

/**
 * Find duplicate contacts by email
 */
export async function findDuplicateContacts(userId: string): Promise<DuplicateContact[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("crm_contacts")
    .select("id, full_name, primary_email, created_at")
    .eq("owner_user_id", userId)
    .not("primary_email", "is", null)
    .neq("primary_email", "");

  if (error) throw error;

  // Group by normalized email
  const emailMap = new Map<string, typeof data>();
  
  (data || []).forEach((contact) => {
    const normalizedEmail = contact.primary_email?.toLowerCase().trim();
    if (!normalizedEmail) return;

    if (!emailMap.has(normalizedEmail)) {
      emailMap.set(normalizedEmail, []);
    }
    emailMap.get(normalizedEmail)!.push(contact);
  });

  // Find duplicates
  const duplicates: DuplicateContact[] = [];

  emailMap.forEach((contacts, email) => {
    if (contacts.length > 1) {
      // Sort by created_at (oldest first)
      const sorted = [...contacts].sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );

      duplicates.push({
        owner_user_id: userId,
        email,
        duplicate_count: contacts.length,
        contact_ids: sorted.map((c) => c.id),
        names: sorted.map((c) => c.full_name || ""),
        created_dates: sorted.map((c) => c.created_at || ""),
      });
    }
  });

  return duplicates;
}

/**
 * Find duplicate organizations by domain
 */
export async function findDuplicateOrganizations(userId: string): Promise<DuplicateOrganization[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("crm_organizations")
    .select("id, name, domain, created_at")
    .eq("owner_user_id", userId)
    .not("domain", "is", null)
    .neq("domain", "");

  if (error) throw error;

  // Group by normalized domain
  const domainMap = new Map<string, typeof data>();

  (data || []).forEach((org) => {
    const normalizedDomain = org.domain?.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!normalizedDomain) return;

    if (!domainMap.has(normalizedDomain)) {
      domainMap.set(normalizedDomain, []);
    }
    domainMap.get(normalizedDomain)!.push(org);
  });

  // Find duplicates
  const duplicates: DuplicateOrganization[] = [];

  domainMap.forEach((orgs, domain) => {
    if (orgs.length > 1) {
      // Sort by created_at (oldest first)
      const sorted = [...orgs].sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );

      duplicates.push({
        owner_user_id: userId,
        domain,
        duplicate_count: orgs.length,
        org_ids: sorted.map((o) => o.id),
        names: sorted.map((o) => o.name || ""),
      });
    }
  });

  return duplicates;
}

/**
 * Merge duplicate contacts (keeps oldest, merges data from others)
 * WARNING: This is a destructive operation. Review duplicates first.
 */
export async function mergeDuplicateContacts(
  userId: string,
  duplicate: DuplicateContact
): Promise<{ kept_id: string; merged_count: number }> {
  const supabase = supabaseServer();

  if (duplicate.contact_ids.length < 2) {
    throw new Error("Cannot merge: need at least 2 contacts");
  }

  // Keep the oldest one (first in sorted array)
  const primaryId = duplicate.contact_ids[0];
  const duplicateIds = duplicate.contact_ids.slice(1);

  // Get all contact data
  const { data: allContacts } = await supabase
    .from("crm_contacts")
    .select("*")
    .eq("owner_user_id", userId)
    .in("id", duplicate.contact_ids);

  if (!allContacts || allContacts.length === 0) {
    throw new Error("Contacts not found");
  }

  const primary = allContacts.find((c) => c.id === primaryId);
  if (!primary) {
    throw new Error("Primary contact not found");
  }

  // Merge data from duplicates into primary
  // Keep non-null values from duplicates if primary is null
  const merged: any = { ...primary };

  allContacts.forEach((contact) => {
    if (contact.id === primaryId) return;

    // Merge fields (keep primary if exists, otherwise use duplicate's value)
    Object.keys(contact).forEach((key) => {
      if (key === "id" || key === "owner_user_id" || key === "created_at") return;
      
      if (!merged[key] && contact[key]) {
        merged[key] = contact[key];
      } else if (Array.isArray(merged[key]) && Array.isArray(contact[key])) {
        // Merge arrays (e.g., tags, emails)
        merged[key] = [...new Set([...merged[key], ...contact[key]])];
      }
    });

    merged.updated_at = new Date().toISOString();
  });

  // Update primary with merged data
  await supabase
    .from("crm_contacts")
    .update(merged)
    .eq("owner_user_id", userId)
    .eq("id", primaryId);

  // Update all references to point to primary
  // Update interactions
  await supabase
    .from("crm_interactions")
    .update({ contact_id: primaryId })
    .eq("owner_user_id", userId)
    .in("contact_id", duplicateIds);

  // Update tasks
  await supabase
    .from("crm_tasks")
    .update({ contact_id: primaryId })
    .eq("owner_user_id", userId)
    .in("contact_id", duplicateIds);

  // Update deals
  await supabase
    .from("crm_deals")
    .update({ primary_contact_id: primaryId })
    .eq("owner_user_id", userId)
    .in("primary_contact_id", duplicateIds);

  // Delete duplicate contacts
  await supabase
    .from("crm_contacts")
    .delete()
    .eq("owner_user_id", userId)
    .in("id", duplicateIds);

  return {
    kept_id: primaryId,
    merged_count: duplicateIds.length,
  };
}

