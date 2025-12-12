// Capture Comms to Second Brain API
// app/api/comms/capture/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { captureCommsThreadToSecondBrain } from "@/lib/comms/second-brain";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 }
      );
    }

    const noteId = await captureCommsThreadToSecondBrain({
      userId,
      channelId,
    });

    return NextResponse.json({
      success: true,
      noteId,
    });
  } catch (err: any) {
    console.error("[CommsCapture] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to capture comms to brain" },
      { status: 500 }
    );
  }
}

