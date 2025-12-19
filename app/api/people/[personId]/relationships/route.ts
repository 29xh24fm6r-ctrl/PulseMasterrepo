import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { personId } = await params;

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get relationships (both directions)
    const { data: relationships, error } = await supabaseAdmin
      .from("contact_relationships")
      .select(`
        *,
        from_contact:crm_contacts!from_contact_id(id, full_name),
        to_contact:crm_contacts!to_contact_id(id, full_name)
      `)
      .eq("user_id", dbUserId)
      .or(`from_contact_id.eq.${personId},to_contact_id.eq.${personId}`);

    if (error) {
      console.error("[GetRelationships] Error:", error);
      return NextResponse.json({ error: "Failed to fetch relationships" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, relationships: relationships || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GetRelationships] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { personId } = await params;
    const body = await req.json();
    const { to_contact_id, relation, notes } = body;

    if (!to_contact_id || typeof to_contact_id !== "string") {
      return NextResponse.json({ error: "to_contact_id is required" }, { status: 400 });
    }

    if (!relation || typeof relation !== "string") {
      return NextResponse.json({ error: "relation is required" }, { status: 400 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Verify both contacts exist
    const { data: fromContact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("id", personId)
      .single();

    const { data: toContact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("id", to_contact_id)
      .single();

    if (!fromContact || !toContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Create relationship
    const { data: relationship, error } = await supabaseAdmin
      .from("contact_relationships")
      .insert({
        user_id: dbUserId,
        from_contact_id: personId,
        to_contact_id,
        relation: relation.trim(),
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[CreateRelationship] Error:", error);
      return NextResponse.json({ error: "Failed to create relationship" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, relationship },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateRelationship] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

