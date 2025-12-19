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

    // Verify contact exists
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("id", personId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Get facts
    const { data: facts, error } = await supabaseAdmin
      .from("contact_facts")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", personId)
      .order("key", { ascending: true });

    if (error) {
      console.error("[GetFacts] Error:", error);
      return NextResponse.json({ error: "Failed to fetch facts" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, facts: facts || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GetFacts] Error:", err);
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
    const { key, value_text, value_json, value_date, confidence = 1.0, source = "manual", source_ref } = body;

    if (!key || typeof key !== "string" || key.length === 0) {
      return NextResponse.json({ error: "Fact key is required" }, { status: 400 });
    }

    if (!value_text && !value_json && !value_date) {
      return NextResponse.json({ error: "At least one value field is required" }, { status: 400 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Verify contact exists
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("id", personId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Create fact
    const { data: fact, error } = await supabaseAdmin
      .from("contact_facts")
      .insert({
        user_id: dbUserId,
        contact_id: personId,
        key: key.trim(),
        value_text: value_text || null,
        value_json: value_json || null,
        value_date: value_date || null,
        confidence: Math.max(0, Math.min(1, confidence)),
        source: source || "manual",
        source_ref: source_ref || null,
        last_confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[CreateFact] Error:", error);
      return NextResponse.json({ error: "Failed to create fact" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, fact },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateFact] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

