// Email Tasks Feedback API
// app/api/email/tasks/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { applyTaskFeedback } from "@/lib/email/tasks";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, feedback } = body;

    if (!taskId || !feedback) {
      return NextResponse.json(
        { error: "taskId and feedback are required" },
        { status: 400 }
      );
    }

    if (!["accepted", "rejected"].includes(feedback)) {
      return NextResponse.json(
        { error: "feedback must be 'accepted' or 'rejected'" },
        { status: 400 }
      );
    }

    await applyTaskFeedback({ taskId, feedback });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[EmailTasksFeedback] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to apply feedback" },
      { status: 500 }
    );
  }
}

