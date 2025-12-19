import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, amount, stage = "prospecting", close_date, person_id } = body;

    if (!title || typeof title !== "string" || title.length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Create deal
    const { data: deal, error: dealError } = await supabaseAdmin
      .from("crm_deals")
      .insert({
        user_id: dbUserId,
        name: title.trim(),
        stage: stage || "prospecting",
        amount: amount ? parseFloat(amount) : null,
        primary_contact_id: person_id || null,
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
