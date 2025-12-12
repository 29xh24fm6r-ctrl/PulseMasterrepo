// Capture Email to Second Brain API
// app/api/email/capture/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { captureEmailThreadToSecondBrain } from "@/lib/email/second-brain";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { threadId } = body;

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    const noteId = await captureEmailThreadToSecondBrain({
      userId,
      threadId,
    });

    return NextResponse.json({
      success: true,
      noteId,
    });
  } catch (err: any) {
    console.error("[EmailCapture] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to capture email to brain" },
      { status: 500 }
    );
  }
}

