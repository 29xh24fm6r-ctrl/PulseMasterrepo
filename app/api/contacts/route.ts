import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

// GET - List all contacts for user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Supabase ID
    const { data: user } = await getSupabaseAdminRuntimeClient()
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ ok: true, contacts: [] });
    }

    const { data: contacts, error } = await getSupabaseAdminRuntimeClient()
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) throw error;

    return NextResponse.json({ ok: true, contacts });
  } catch (err: any) {
    console.error("Contacts GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create new contact
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Get user's Supabase ID
    const { data: user } = await getSupabaseAdminRuntimeClient()
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for duplicates
    if (body.name) {
      const { data: existing } = await getSupabaseAdminRuntimeClient()
        .from("contacts")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", body.name)
        .single();

      if (existing) {
        return NextResponse.json({ error: "Contact already exists", duplicate: true }, { status: 409 });
      }
    }

    const { data: contact, error } = await getSupabaseAdminRuntimeClient()
      .from("contacts")
      .insert({
        user_id_uuid: user.id,
        owner_user_id_legacy: user.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        title: body.role || body.title,
        industry: body.industry,
        linkedin: body.linkedIn,
        website: body.website,
        birthday: body.birthday && body.birthday.trim() ? body.birthday : null,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        interests: body.interests,
        relationship: body.relationship,
        status: body.relationshipStrength || body.status || "New",
        how_we_met: body.howWeMet,
        introduced_by: body.introducedBy,
        notes: body.notes,
        tags: body.tags,
        last_contact: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, contact });
  } catch (err: any) {
    console.error("Contacts POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}