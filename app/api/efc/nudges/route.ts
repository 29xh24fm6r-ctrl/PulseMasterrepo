// API Route: /api/efc/nudges
// Manage follow-through nudges

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FollowThroughTracker } from "@/lib/efc/follow-through-tracker";

// GET /api/efc/nudges - Get active nudges
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate any new nudges
    await FollowThroughTracker.generateNudgesForUser(userId);

    // Get active nudges
    const nudges = await FollowThroughTracker.getActiveNudges(userId);

    return NextResponse.json({
      nudges: nudges.map(n => ({
        id: n.id,
        type: n.nudge_type,
        message: n.message,
        urgency: n.urgency,
        commitment_id: n.commitment_id,
        created_at: n.created_at,
      })),
      count: nudges.length,
    });
  } catch (error: any) {
    console.error("[EFC Nudges GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/efc/nudges - Create a manual nudge or acknowledge/snooze
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, nudge_id, hours, commitment_id, message, nudge_type, urgency } = body;

    // Handle acknowledge
    if (action === "acknowledge" && nudge_id) {
      await FollowThroughTracker.acknowledgeNudge(userId, nudge_id);
      return NextResponse.json({ success: true, action: "acknowledged" });
    }

    // Handle snooze
    if (action === "snooze" && nudge_id && hours) {
      await FollowThroughTracker.snoozeNudge(userId, nudge_id, hours);
      return NextResponse.json({ success: true, action: "snoozed", until: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() });
    }

    // Create manual nudge
    if (message && nudge_type) {
      const nudge = await FollowThroughTracker.createNudge(userId, {
        commitment_id,
        nudge_type,
        message,
        urgency: urgency || "today",
      });
      return NextResponse.json({ success: true, nudge });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("[EFC Nudges POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}