// AGI Feedback API - Record user feedback on AGI actions
// app/api/agi/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { recordAGIFeedback } from "@/lib/agi/feedback";

export async function POST(req: NextRequest) {
  try {
    const userId = await auth().then(({ userId }) => userId);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { actionId, feedbackType, comment } = body;

    if (!actionId || !feedbackType) {
      return NextResponse.json(
        { error: "actionId and feedbackType are required" },
        { status: 400 }
      );
    }

    if (!["accepted", "modified", "rejected"].includes(feedbackType)) {
      return NextResponse.json(
        { error: "feedbackType must be 'accepted', 'modified', or 'rejected'" },
        { status: 400 }
      );
    }

    await recordAGIFeedback(userId, actionId, feedbackType as "accepted" | "modified" | "rejected", comment);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("AGI feedback error:", err);
    return NextResponse.json({ error: err.message || "Failed to record feedback" }, { status: 500 });
  }
}



