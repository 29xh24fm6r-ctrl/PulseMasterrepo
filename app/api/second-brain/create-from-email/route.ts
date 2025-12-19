// app/api/second-brain/create-from-email/route.ts
// MIGRATED: Now uses Supabase via /api/contacts
// This endpoint is kept for backward compatibility but delegates to Supabase
import { NextRequest, NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePulseUserUuidFromClerk } from "@/lib/auth/resolvePulseUserUuid";

export const dynamic = "force-dynamic";

/**
 * Create contact from email data
 * Now uses Supabase (crm_contacts) instead of Notion
 */
export async function POST(req: NextRequest) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = await req.json();

    const {
      name,
      email,
      phone,
      company,
      role,
      industry,
      linkedIn,
      website,
      birthday,
      address,
      city,
      state,
      zip,
      relationship,
      relationshipStrength,
      howWeMet,
      introducedBy,
      interests,
      notes,
      tags,
    } = body;

    if (!name) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }

    // Resolve full name
    let firstName = "";
    let lastName = "";
    let fullName = name.trim();

    const nameParts = fullName.split(/\s+/);
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    } else {
      firstName = fullName;
      lastName = "";
    }

    // Resolve Pulse UUID
    let pulseUserUuid: string;
    try {
      pulseUserUuid = await resolvePulseUserUuidFromClerk(clerkUserId);
    } catch (err: any) {
      console.error("[create-from-email] Failed to resolve Pulse UUID:", err);
      return NextResponse.json(
        { ok: false, error: "User account not found" },
        { status: 404 }
      );
    }

    // Normalize helpers
    function normalizeEmail(email: string | null | undefined) {
      if (!email) return null;
      return email.trim().toLowerCase();
    }

    function normalizePhone(phone: string | null | undefined) {
      if (!phone) return null;
      const digits = phone.replace(/\D/g, "");
      return digits.length ? digits : null;
    }

    function normalizeFullName(first: string, last: string) {
      return `${first} ${last}`.trim().toLowerCase();
    }

    // Build notes field from all available data
    const notesParts: string[] = [];
    if (notes) notesParts.push(notes);
    if (howWeMet) notesParts.push(`How we met: ${howWeMet}`);
    if (introducedBy) notesParts.push(`Introduced by: ${introducedBy}`);
    if (interests && Array.isArray(interests) && interests.length > 0) {
      notesParts.push(`Interests: ${interests.join(", ")}`);
    }
    if (address || city || state || zip) {
      const addressParts = [address, city, state, zip].filter(Boolean);
      if (addressParts.length > 0) {
        notesParts.push(`Address: ${addressParts.join(", ")}`);
      }
    }
    if (birthday) notesParts.push(`Birthday: ${birthday}`);
    if (linkedIn) notesParts.push(`LinkedIn: ${linkedIn}`);
    if (website) notesParts.push(`Website: ${website}`);
    if (industry) notesParts.push(`Industry: ${industry}`);

    const combinedNotes = notesParts.length > 0 ? notesParts.join("\n\n") : null;

    // Build tags array
    const tagsArray: string[] = [];
    if (Array.isArray(tags)) tagsArray.push(...tags);
    if (relationship) tagsArray.push(relationship);
    if (relationshipStrength) tagsArray.push(relationshipStrength);

    // Insert into crm_contacts
    const insertRow = {
      user_id: pulseUserUuid,
      owner_user_id: clerkUserId,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      display_name: fullName,
      company_name: company?.trim() || null,
      job_title: role?.trim() || null,
      title: role?.trim() || null,
      primary_email: email?.trim() || null,
      primary_phone: phone?.trim() || null,
      type: "Business",
      tags: tagsArray.length > 0 ? tagsArray : [],
      timezone: null,
      normalized_email: normalizeEmail(email),
      normalized_phone: normalizePhone(phone),
      normalized_full_name: normalizeFullName(firstName, lastName),
      notes: combinedNotes,
    };

    const { data: contact, error } = await supabaseAdmin
      .from("crm_contacts")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      console.error("[create-from-email] Insert error:", error);
      
      // Handle duplicate contact (foundation-mode trigger)
      if (error.message?.includes("Duplicate contact blocked")) {
        return NextResponse.json(
          {
            ok: false,
            error: `Contact "${name}" already exists`,
            duplicate: true,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { ok: false, error: error.message || "Failed to create contact" },
        { status: 500 }
      );
    }

    console.log(`✅ Contact created from email: ${contact.id}`);

    return NextResponse.json({
      ok: true,
      contactId: contact.id,
      contact: contact,
      message: "Contact created successfully",
    });
  } catch (err: any) {
    console.error("❌ Error creating contact from email:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create contact" },
      { status: 500 }
    );
  }
}
