// Emotion-Aware Coach Reply API
// app/api/coaches/reply/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoachTurn } from "@/lib/coaching/engine";
import { CoachId } from "@/lib/coaching/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { coachId, userMessage, emotion, context } = body;

    if (!coachId || !userMessage) {
      return NextResponse.json(
        { error: "coachId and userMessage are required" },
        { status: 400 }
      );
    }

    const result = await generateCoachTurn({
      userId,
      coachId: coachId as CoachId,
      userMessage,
      emotion,
      context,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[CoachReply] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate coach reply" },
      { status: 500 }
    );
  }
}

