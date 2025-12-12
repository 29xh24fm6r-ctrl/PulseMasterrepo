// Capture Audio to Second Brain API
// app/api/comms/audio/capture/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { captureAudioToSecondBrain } from "@/lib/comms/second-brain";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { commMessageId } = body;

    if (!commMessageId) {
      return NextResponse.json(
        { error: "commMessageId is required" },
        { status: 400 }
      );
    }

    const noteId = await captureAudioToSecondBrain({
      userId,
      commMessageId,
    });

    return NextResponse.json({
      success: true,
      noteId,
    });
  } catch (err: any) {
    console.error("[AudioCapture] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to capture audio to brain" },
      { status: 500 }
    );
  }
}

