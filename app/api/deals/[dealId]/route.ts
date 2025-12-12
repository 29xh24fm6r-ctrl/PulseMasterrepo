// Deal Detail API
// app/api/deals/[dealId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const dealId = params.dealId;

    const { data: deal } = await supabaseAdmin
      .from("deals")
      .select("*, deal_participants(*, contacts(*))")
      .eq("id", dealId)
      .eq("user_id", dbUserId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json(deal);
  } catch (err: any) {
    console.error("[DealDetail] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get deal" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const dealId = params.dealId;
    const body = await req.json();

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("deals")
      .select("id")
      .eq("id", dealId)
      .eq("user_id", dbUserId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Update deal
    const { data: updated } = await supabaseAdmin
      .from("deals")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId)
      .select("*")
      .single();

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[DealUpdate] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update deal" },
      { status: 500 }
    );
  }
}

