/**
 * Identity Card Builder
 * Gathers anchors for entity resolution
 */

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface IdentityCard {
  contactId: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  keywords?: string[];
  location?: string | null;
  companyDomain?: string | null;
  knownSocialUrls?: string[];
  knownHandles?: string[];
  email?: string | null;
}

/**
 * Build or retrieve identity card for a contact
 */
export async function buildIdentityCard(
  userId: string,
  contactId: string
): Promise<IdentityCard> {
  // Get contact data
  const { data: contact, error: contactError } = await supabaseAdmin
    .from("crm_contacts")
    .select("id, full_name, first_name, last_name, company_name, title, industry, keywords, primary_email")
    .eq("id", contactId)
    .eq("user_id", userId)
    .single();

  if (contactError || !contact) {
    throw new Error(`Contact not found: ${contactError?.message || "Unknown error"}`);
  }

  // Get or create identity record
  let { data: identity } = await supabaseAdmin
    .from("crm_contact_identity")
    .select("company_domain, location, known_social_urls, known_handles")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .maybeSingle();

  // Create identity record if it doesn't exist
  if (!identity) {
    const { data: newIdentity } = await supabaseAdmin
      .from("crm_contact_identity")
      .insert({
        user_id: userId,
        contact_id: contactId,
        company_domain: extractDomain(contact.company_name),
        known_social_urls: [],
        known_handles: [],
      })
      .select()
      .single();

    identity = newIdentity;
  }

  return {
    contactId: contact.id,
    name: contact.full_name,
    firstName: contact.first_name,
    lastName: contact.last_name,
    companyName: contact.company_name,
    jobTitle: contact.title,
    industry: contact.industry,
    keywords: (contact.keywords as string[]) || [],
    location: identity?.location || null,
    companyDomain: identity?.company_domain || extractDomain(contact.company_name),
    knownSocialUrls: (identity?.known_social_urls as string[]) || [],
    knownHandles: (identity?.known_handles as string[]) || [],
    email: contact.primary_email,
  };
}

/**
 * Extract domain from company name or email
 * Simple heuristic - can be improved
 */
function extractDomain(companyName?: string | null): string | null {
  if (!companyName) return null;

  // If it looks like a domain already, return as-is
  if (companyName.includes(".") && !companyName.includes(" ")) {
    return companyName.toLowerCase();
  }

  // TODO: Could add domain lookup logic here
  return null;
}

