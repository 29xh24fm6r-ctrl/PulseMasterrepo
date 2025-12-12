// Coaching Greeting API
// app/api/coaching/greeting/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateContextualGreeting } from "@/lib/brain/coaching-memory";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const coachId = url.searchParams.get("coachId");

    if (!coachId) {
      return NextResponse.json(
        { error: "coachId is required" },
        { status: 400 }
      );
    }

    const greeting = await generateContextualGreeting(userId, coachId);

    return NextResponse.json({
      greeting: greeting || "Welcome! How can I help you today?",
      hasMemory: greeting !== null,
    });
  } catch (err: any) {
    console.error("[CoachingGreeting] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate greeting" },
      { status: 500 }
    );
  }
}

