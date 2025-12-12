// Unified Organism API - Contacts
// app/api/organism/contacts/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api/routeErrors";
import { resolveIdentity } from "@/lib/organism";

// GET - List contacts
export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const organization_id = searchParams.get("organization_id") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    let query = supabase
      .from("crm_contacts")
      .select("*, organization:crm_organizations(name, domain)")
      .eq("owner_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,primary_email.ilike.%${search}%,company_name.ilike.%${search}%`
      );
    }

    if (organization_id) {
      query = query.eq("organization_id", organization_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return jsonOk({ contacts: data || [] });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

// POST - Create or resolve contact
export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const body = await request.json();

    // Use identity resolver to prevent duplicates
    const resolution = await resolveIdentity(userId, {
      email: body.email,
      phone: body.phone,
      name: body.name,
      firstName: body.firstName,
      lastName: body.lastName,
      company: body.company,
      domain: body.domain,
      organizationId: body.organization_id,
    });

    if (!resolution.contact_id) {
      return jsonError("Failed to resolve or create contact", 500);
    }

    // Fetch the contact details
    const supabase = supabaseServer();
    const { data: contact, error } = await supabase
      .from("crm_contacts")
      .select("*, organization:crm_organizations(name, domain)")
      .eq("owner_user_id", userId)
      .eq("id", resolution.contact_id)
      .single();

    if (error) throw error;

    return jsonOk({
      contact,
      resolution: {
        did_create: resolution.did_create_contact,
        matched_by: resolution.matched_by,
        confidence: resolution.confidence,
        tb_node_id: resolution.tb_node_id,
      },
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

