// Update Daily Focus Status API
// app/api/life-arc/autopilot/daily-focus/[focusId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { focusId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["planned", "in_progress", "done", "skipped"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Update focus item
    const { error } = await supabaseAdmin
      .from("life_arc_daily_focus")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.focusId)
      .eq("user_id", dbUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DailyFocusUpdate] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update focus" },
      { status: 500 }
    );
  }
}




