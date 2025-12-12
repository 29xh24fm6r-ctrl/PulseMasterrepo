// Autopilot Action Approve API
// app/api/autopilot/actions/[actionId]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: { actionId: string } }
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

    const actionId = params.actionId;

    // Verify action belongs to user
    const { data: action } = await supabaseAdmin
      .from("autopilot_actions")
      .select("*")
      .eq("id", actionId)
      .eq("user_id", dbUserId)
      .single();

    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    // Update status
    const { data: updated } = await supabaseAdmin
      .from("autopilot_actions")
      .update({ status: "approved" })
      .eq("id", actionId)
      .select("*")
      .single();

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[Autopilot] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to approve action" },
      { status: 500 }
    );
  }
}




