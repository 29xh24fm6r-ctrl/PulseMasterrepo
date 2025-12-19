/**
 * Get CRM Person/Contact by ID
 * - Primary: crm_contacts.id (scoped)
 * - Secondary: resolve "People contact id" -> crm_contacts via source columns or normalized identifiers
 */

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Args = {
  contactId: string;
  clerkUserId: string;
  dbUserId?: string | null;
};

type Result = {
  contact: any | null;
  error: any | null;
  resolvedBy?: "crm_id" | "source_id" | "normalized_match" | "owner_fallback";
};

export async function getCrmPerson({ contactId, clerkUserId, dbUserId }: Args): Promise<Result> {
  // Helper: attempt a scoped fetch by a single equality constraint
  async function fetchOne(where: Record<string, any>) {
    const q = supabaseAdmin.from("crm_contacts").select("*");
    let built = q;
    for (const [k, v] of Object.entries(where)) built = built.eq(k, v);
    const { data, error } = await built.maybeSingle();
    return { data, error };
  }

  // 1) Primary: crm_contacts.id (UUID), scoped by dbUserId first
  if (dbUserId) {
    // active first
    let r = await fetchOne({ id: contactId, user_id: dbUserId, status: "active" });
    if (r.data) return { contact: r.data, error: null, resolvedBy: "crm_id" };

    // allow merged for redirect logic
    r = await fetchOne({ id: contactId, user_id: dbUserId });
    if (r.data) return { contact: r.data, error: null, resolvedBy: "crm_id" };
  }

  // 2) Fallback: owner_user_id (Clerk ID)
  {
    // active first
    let r = await fetchOne({ id: contactId, owner_user_id: clerkUserId, status: "active" });
    if (r.data) return { contact: r.data, error: null, resolvedBy: "owner_fallback" };

    // allow merged
    r = await fetchOne({ id: contactId, owner_user_id: clerkUserId });
    if (r.data) return { contact: r.data, error: null, resolvedBy: "owner_fallback" };
  }

  // 3) Resolver: maybe the incoming ID is a "People/contacts" ID, not a crm_contacts.id
  // Try common source-id columns on crm_contacts that might store the original contact id.
  // (If a column doesn't exist, Supabase returns an error; we just skip.)
  const candidateSourceCols = [
    "source_contact_id",
    "raw_contact_id",
    "contact_id",
    "external_contact_id",
    "people_contact_id",
  ];

  for (const col of candidateSourceCols) {
    // Try user_id scope first (preferred)
    if (dbUserId) {
      const { data, error } = await supabaseAdmin
        .from("crm_contacts")
        .select("*")
        .eq("user_id", dbUserId)
        .eq(col, contactId)
        .maybeSingle();

      // If column doesn't exist, skip silently
      if (error && /does not exist/i.test(String(error.message || error))) continue;

      if (data) {
        // active preferred, but if it exists, return it (merged redirect handled by caller)
        if (data.status === "active" || data.status === "merged") {
          return { contact: data, error: null, resolvedBy: "source_id" };
        }
        return { contact: data, error: null, resolvedBy: "source_id" };
      }
    }

    // Try owner_user_id scope next
    {
      const { data, error } = await supabaseAdmin
        .from("crm_contacts")
        .select("*")
        .eq("owner_user_id", clerkUserId)
        .eq(col, contactId)
        .maybeSingle();

      if (error && /does not exist/i.test(String(error.message || error))) continue;

      if (data) {
        return { contact: data, error: null, resolvedBy: "source_id" };
      }
    }
  }

  // 4) Last-resort resolver: try matching by normalized identifiers if present in crm_contacts
  // NOTE: This only works if normalized_email/phone exist on crm_contacts and you can obtain
  // an identifier from the incoming contactId (you usually can't). So we only do a minimal
  // "id-like" check here and skip otherwise.
  //
  // If you want true normalized matching, you should pass email/phone from People list into the CRM link.
  // For now, we return a clean error message.
  return {
    contact: null,
    error: {
      message:
        "CRM contact not found. Looked for crm_contacts.id and common source-id columns. Likely you are linking with a People/contacts id that is not mapped into crm_contacts.",
      contactId,
      dbUserId: dbUserId ?? null,
      clerkUserId,
    },
  };
}
