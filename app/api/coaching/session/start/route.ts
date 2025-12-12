// Start Coaching Session API
// app/api/coaching/session/start/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { startSession } from "@/lib/coaching/timeline";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { coachId, initialEmotion } = body;

    if (!coachId) {
      return NextResponse.json(
        { error: "coachId is required" },
        { status: 400 }
      );
    }

    const sessionId = await startSession(userId, coachId, initialEmotion);

    return NextResponse.json({ sessionId });
  } catch (err: any) {
    console.error("[SessionStart] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to start session" },
      { status: 500 }
    );
  }
}

