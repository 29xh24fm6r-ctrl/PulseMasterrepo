// Get Active Session API
// app/api/coaching/session/active/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getActiveSession } from "@/lib/coaching/timeline";

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

    const session = await getActiveSession(userId, coachId);

    return NextResponse.json({
      sessionId: session?.id || null,
      session: session || null,
    });
  } catch (err: any) {
    console.error("[SessionActive] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get active session" },
      { status: 500 }
    );
  }
}

