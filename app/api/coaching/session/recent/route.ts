// Get Recent Sessions API
// app/api/coaching/session/recent/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRecentSessions } from "@/lib/coaching/timeline";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const coachId = url.searchParams.get("coachId");
    const limit = Number(url.searchParams.get("limit") || "3");

    if (!coachId) {
      return NextResponse.json(
        { error: "coachId is required" },
        { status: 400 }
      );
    }

    const sessions = await getRecentSessions(userId, coachId, limit);

    return NextResponse.json({ sessions });
  } catch (err: any) {
    console.error("[SessionRecent] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get recent sessions" },
      { status: 500 }
    );
  }
}

