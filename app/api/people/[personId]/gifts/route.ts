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

    // Get gifts
    const { data: gifts, error } = await supabaseAdmin
      .from("gift_ideas")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", personId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GetGifts] Error:", error);
      return NextResponse.json({ error: "Failed to fetch gifts" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, gifts: gifts || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GetGifts] Error:", err);
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
    const { occasion, idea, price_range, why, status = "idea" } = body;

    if (!idea || typeof idea !== "string" || idea.length === 0) {
      return NextResponse.json({ error: "Gift idea is required" }, { status: 400 });
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

    // Create gift
    const { data: gift, error } = await supabaseAdmin
      .from("gift_ideas")
      .insert({
        user_id: dbUserId,
        contact_id: personId,
        occasion: occasion || null,
        idea: idea.trim(),
        price_range: price_range || null,
        why: why || null,
        status: status || "idea",
      })
      .select()
      .single();

    if (error) {
      console.error("[CreateGift] Error:", error);
      return NextResponse.json({ error: "Failed to create gift" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, gift },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateGift] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

