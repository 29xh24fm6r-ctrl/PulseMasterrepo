/**
 * Notification Digest API
 * GET /api/notifications/digest - Get digest preview
 * POST /api/notifications/digest - Send digest
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  generateMorningDigest,
  generateEveningDigest,
  sendMorningDigest,
  sendEveningDigest,
  processNotificationQueue,
} from "@/lib/notifications/advanced";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = req.nextUrl.searchParams.get("type") || "morning";

    const digest = type === "evening"
      ? await generateEveningDigest(userId)
      : await generateMorningDigest(userId);

    return NextResponse.json({ digest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, type } = body;

    if (action === "send") {
      const success = type === "evening"
        ? await sendEveningDigest(userId)
        : await sendMorningDigest(userId);
      return NextResponse.json({ success });
    }

    if (action === "process-queue") {
      const result = await processNotificationQueue();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}