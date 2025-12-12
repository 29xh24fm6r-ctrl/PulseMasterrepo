// End Coaching Session API
// app/api/coaching/session/end/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { endSession, getSessionTimeline } from "@/lib/coaching/timeline";
import { saveCoachSessionMemory } from "@/lib/brain/coaching-memory";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, emotionEnd } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Get timeline to calculate total XP
    const timeline = await getSessionTimeline(sessionId);
    if (!timeline) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // End session
    await endSession(sessionId, emotionEnd || null, timeline.totalXPEarned);

    // Save to Second Brain
    try {
      await saveCoachSessionMemory(userId, timeline);
    } catch (err) {
      console.warn("[SessionEnd] Failed to save memory:", err);
      // Don't fail the request if memory save fails
    }

    return NextResponse.json({
      success: true,
      sessionId,
      xpEarned: timeline.totalXPEarned,
    });
  } catch (err: any) {
    console.error("[SessionEnd] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to end session" },
      { status: 500 }
    );
  }
}

