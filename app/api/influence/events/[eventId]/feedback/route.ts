// Influence Event Feedback API
// app/api/influence/events/[eventId]/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
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

    const eventId = params.eventId;
    const body = await req.json();
    const { user_action, user_feedback, actual_outcome } = body;

    // Verify ownership
    const { data: event } = await supabaseAdmin
      .from("contact_influence_events")
      .select("id")
      .eq("id", eventId)
      .eq("user_id", dbUserId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Update event
    await supabaseAdmin
      .from("contact_influence_events")
      .update({
        user_action: user_action || null,
        user_feedback: user_feedback || null,
        actual_outcome: actual_outcome || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[InfluenceFeedback] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update feedback" },
      { status: 500 }
    );
  }
}

