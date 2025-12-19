// lib/contacts/service.ts
// Centralized contact service to prevent duplication
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePulseUserUuidFromClerk } from "@/lib/auth/resolvePulseUserUuid";

export type ContactInput = {
  firstName?: string;
  lastName?: string;
  name?: string; // Single name field (will be split)
  contactInput?: string; // Legacy alias
  company?: string;
  email?: string;
  phone?: string;
  title?: string;
  role?: string; // Alias for title
  type?: string;
  tags?: string[];
  notes?: string;
  timezone?: string;
};

export type NormalizedContact = {
  first_name: string;
  last_name: string;
  full_name: string;
  display_name: string;
  company_name: string | null;
  job_title: string | null;
  title: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  type: string;
  tags: string[];
  timezone: string | null;
  normalized_email: string | null;
  normalized_phone: string | null;
  normalized_full_name: string;
  notes?: string | null;
};

/**
 * Normalize contact input into canonical format
 */
export function normalizeContactInput(input: ContactInput): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  let firstName = input.firstName?.trim() || "";
  let lastName = input.lastName?.trim() || "";
  let fullName = "";

  if (firstName && lastName) {
    fullName = `${firstName} ${lastName}`;
  } else if (input.name?.trim()) {
    fullName = input.name.trim();
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts.slice(1).join(" ");
    } else {
      firstName = fullName;
      lastName = "";
    }
  } else if (input.contactInput?.trim()) {
    fullName = input.contactInput.trim();
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts.slice(1).join(" ");
    } else {
      firstName = fullName;
      lastName = "";
    }
  }

  return { firstName, lastName, fullName };
}

/**
 * Normalize email to lowercase
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * Normalize phone to digits only
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length ? digits : null;
}

/**
 * Normalize full name to lowercase
 */
export function normalizeFullName(first: string, last: string): string {
  return `${first} ${last}`.trim().toLowerCase();
}

/**
 * Build insert row for crm_contacts table
 */
export function buildContactInsertRow(
  input: ContactInput,
  clerkUserId: string,
  pulseUserUuid: string
): NormalizedContact {
  const { firstName, lastName, fullName } = normalizeContactInput(input);

  return {
    user_id: pulseUserUuid as any, // Type assertion for Supabase
    owner_user_id: clerkUserId as any,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    display_name: fullName,
    company_name: input.company?.trim() || null,
    job_title: input.title?.trim() || input.role?.trim() || null,
    title: input.title?.trim() || input.role?.trim() || null,
    primary_email: input.email?.trim() || null,
    primary_phone: input.phone?.trim() || null,
    type: input.type || "Business",
    tags: Array.isArray(input.tags) ? input.tags : [],
    timezone: input.timezone || null,
    normalized_email: normalizeEmail(input.email),
    normalized_phone: normalizePhone(input.phone),
    normalized_full_name: normalizeFullName(firstName, lastName),
    notes: input.notes?.trim() || null,
  } as any;
}

/**
 * Create contact in Supabase (canonical method)
 */
export async function createContact(
  input: ContactInput,
  clerkUserId: string
): Promise<{ ok: boolean; contact?: any; error?: string }> {
  try {
    if (!input.firstName && !input.lastName && !input.name && !input.contactInput) {
      return { ok: false, error: "Name is required" };
    }

    const pulseUserUuid = await resolvePulseUserUuidFromClerk(clerkUserId);
    const insertRow = buildContactInsertRow(input, clerkUserId, pulseUserUuid);

    const { data: contact, error } = await supabaseAdmin
      .from("crm_contacts")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      if (error.message?.includes("Duplicate contact blocked")) {
        return { ok: false, error: "Contact already exists", duplicate: true as any };
      }
      throw error;
    }

    return { ok: true, contact };
  } catch (err: any) {
    console.error("[createContact] Error:", err);
    return { ok: false, error: err.message || "Failed to create contact" };
  }
}

