import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const { title, amount, stage = "lead", close_date } = body;

    // Validate input
    if (!title || typeof title !== "string" || title.length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (title.length > 500) {
      return NextResponse.json({ error: "Title too long (max 500 chars)" }, { status: 400 });
    }

    // Resolve user UUID first
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Verify contact exists and belongs to user (use user_id UUID)
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("id", personId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Create deal
    const { data: deal, error: dealError } = await supabaseAdmin
      .from("crm_deals")
      .insert({
        user_id: dbUserId,
        name: title.trim(),
        stage,
        amount: amount ? parseFloat(amount) : null,
        primary_contact_id: personId,
        close_date: close_date || null,
      })
      .select()
      .single();

    if (dealError) {
      console.error("[CreateDeal] Error:", dealError);
      return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, deal },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateDeal] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

