import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string; giftId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { personId, giftId } = await params;
    const body = await req.json();
    const { status, idea, price_range, why } = body;

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Verify gift belongs to contact and user
    const { data: gift } = await supabaseAdmin
      .from("gift_ideas")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("contact_id", personId)
      .eq("id", giftId)
      .single();

    if (!gift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    // Update gift
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status && ["idea", "bought", "given"].includes(status)) {
      updateData.status = status;
    }
    if (idea) updateData.idea = idea;
    if (price_range !== undefined) updateData.price_range = price_range;
    if (why !== undefined) updateData.why = why;

    const { data: updatedGift, error } = await supabaseAdmin
      .from("gift_ideas")
      .update(updateData)
      .eq("id", giftId)
      .select()
      .single();

    if (error) {
      console.error("[UpdateGift] Error:", error);
      return NextResponse.json({ error: "Failed to update gift" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, gift: updatedGift },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[UpdateGift] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

