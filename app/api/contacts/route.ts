// app/api/contacts/route.ts
// Sprint 3B: Uses canonical resolveSupabaseUser()
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";
import { withApiAnalytics } from "@/lib/analytics/api";

export const dynamic = "force-dynamic";

// GET - List all contacts for user
export async function GET(req: Request) {
  return withApiAnalytics(req, async () => {
    const meta = getRequestMeta();
    const t0 = Date.now();
    log.info("route.start", { ...meta, route: "GET /api/contacts" });

    try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const { data: contacts, error } = await supabaseAdmin
      .from("crm_contacts")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("display_name");

    if (error) throw error;

      log.info("route.ok", { ...meta, route: "GET /api/contacts", ms: Date.now() - t0, count: contacts?.length || 0 });
      return NextResponse.json({ ok: true, contacts: contacts ?? [] });
    } catch (err: any) {
      log.error("route.err", { ...meta, route: "GET /api/contacts", ms: Date.now() - t0, error: err?.message || String(err) });
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  });
}

// POST - Create new contact
// Supports flexible input: firstName/lastName, name, or contactInput
export async function POST(req: NextRequest) {
  return withApiAnalytics(req, async () => {
    const meta = getRequestMeta();
    const t0 = Date.now();
    log.info("route.start", { ...meta, route: "POST /api/contacts" });

    try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await req.json();

    // Ignore user_id if provided (server sets it)
    if (body.user_id) {
      delete body.user_id;
    }

    // Resolve full name from various input formats
    let firstName = body.firstName?.trim() || "";
    let lastName = body.lastName?.trim() || "";
    let fullName = "";

    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`;
    } else if (body.name?.trim()) {
      fullName = body.name.trim();
      // Split if single name provided
      const parts = fullName.split(/\s+/);
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      } else {
        firstName = fullName;
        lastName = "";
      }
    } else if (body.contactInput?.trim()) {
      fullName = body.contactInput.trim();
      const parts = fullName.split(/\s+/);
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      } else {
        firstName = fullName;
        lastName = "";
      }
    }

    if (!fullName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Normalize email/phone
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

    // Insert into crm_contacts (matches /api/people/create schema)
    // Sprint 3B: Only use user_id UUID, no owner_user_id
    const insertRow = {
      user_id: supabaseUserId,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      display_name: fullName,
      company_name: body.company?.trim() || null,
      job_title: body.title?.trim() || body.role?.trim() || null,
      title: body.title?.trim() || body.role?.trim() || null,
      primary_email: body.email?.trim() || null,
      primary_phone: body.phone?.trim() || null,
      type: body.type || "Business",
      tags: Array.isArray(body.tags) ? body.tags : [],
      timezone: body.timezone || null,
      normalized_email: normalizeEmail(body.email),
      normalized_phone: normalizePhone(body.phone),
      normalized_full_name: normalizeFullName(firstName, lastName),
      // Additional fields if provided
      notes: body.notes?.trim() || null,
    };

    const { data: contact, error } = await supabaseAdmin
      .from("crm_contacts")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      // Handle duplicate contact (foundation-mode trigger)
      if (error.message?.includes("Duplicate contact blocked")) {
        log.warn("route.duplicate", { ...meta, route: "POST /api/contacts", ms: Date.now() - t0 });
        return NextResponse.json(
          { error: "Contact already exists", duplicate: true },
          { status: 409 }
        );
      }
      throw error;
    }

      log.info("route.ok", { ...meta, route: "POST /api/contacts", ms: Date.now() - t0, contactId: contact?.id });
      return NextResponse.json({ contact }, { status: 200 });
    } catch (err: any) {
      log.error("route.err", { ...meta, route: "POST /api/contacts", ms: Date.now() - t0, error: err?.message || String(err) });
      return NextResponse.json({ error: err.message || "Failed to create contact" }, { status: 500 });
    }
  });
}