// Get Session Timeline API
// app/api/coaching/session/timeline/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSessionTimeline } from "@/lib/coaching/timeline";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const timeline = await getSessionTimeline(sessionId);

    if (!timeline) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(timeline);
  } catch (err: any) {
    console.error("[SessionTimeline] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get timeline" },
      { status: 500 }
    );
  }
}

