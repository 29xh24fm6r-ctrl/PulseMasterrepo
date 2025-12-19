/**
 * Canonical Contact Identity Resolver
 * 
 * Ensures we always resolve to the canonical active contact record,
 * handling merged contacts by redirecting to the winner.
 */

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Resolves a contact ID to its canonical ID (handles merged contacts)
 * @param contactId - The contact ID from URL or query
 * @param clerkUserId - Clerk user ID for ownership validation
 * @returns The canonical contact ID (same as input if already canonical, or merged_into_contact_id if merged)
 */
export async function resolveCanonicalContactId(
  contactId: string,
  clerkUserId: string
): Promise<{ canonicalId: string; isMerged: boolean; originalId: string }> {
  // Fetch the contact
  const { data: contact, error } = await supabaseAdmin
    .from("crm_contacts")
    .select("id, status, merged_into_contact_id, owner_user_id, user_id")
    .eq("id", contactId)
    .single();

  if (error || !contact) {
    throw new Error(`Contact not found: ${contactId}`);
  }

  // Validate ownership (check both owner_user_id and user_id if available)
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  const dbUserId = userRow?.id;

  // Check ownership - contact must belong to this user
  const isOwner =
    contact.owner_user_id === clerkUserId ||
    (dbUserId && contact.user_id === dbUserId);

  if (!isOwner) {
    throw new Error(`Contact not accessible: ${contactId}`);
  }

  // If merged, resolve to canonical
  if (contact.status === "merged" && contact.merged_into_contact_id) {
    // Follow the merge chain once (should be sufficient, but can be extended to loop)
    const { data: canonical } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, status, merged_into_contact_id")
      .eq("id", contact.merged_into_contact_id)
      .single();

    if (canonical && canonical.status === "active") {
      return {
        canonicalId: canonical.id,
        isMerged: true,
        originalId: contactId,
      };
    }

    // If canonical is also merged (shouldn't happen, but handle it)
    if (canonical?.merged_into_contact_id) {
      throw new Error(`Merge chain detected: ${contactId} → ${canonical.id} → ?`);
    }
  }

  // Already canonical
  return {
    canonicalId: contactId,
    isMerged: false,
    originalId: contactId,
  };
}

/**
 * Gets the canonical contact record by ID
 * @param contactId - The contact ID from URL or query
 * @param clerkUserId - Clerk user ID for ownership validation
 * @returns The canonical contact record
 */
export async function getCanonicalContactById(
  contactId: string,
  clerkUserId: string
) {
  const { canonicalId } = await resolveCanonicalContactId(contactId, clerkUserId);

  const { data: contact, error } = await supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .eq("id", canonicalId)
    .single();

  if (error || !contact) {
    throw new Error(`Canonical contact not found: ${canonicalId}`);
  }

  return contact;
}

