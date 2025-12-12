// Email Reply Drafts API
// app/api/email/reply-drafts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateReplyDrafts } from "@/lib/email/reply-drafts";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { threadId, messageId } = body;

    if (!threadId || !messageId) {
      return NextResponse.json(
        { error: "threadId and messageId are required" },
        { status: 400 }
      );
    }

    const drafts = await generateReplyDrafts({
      userId,
      threadId,
      messageId,
    });

    return NextResponse.json({ drafts });
  } catch (err: any) {
    console.error("[EmailReplyDrafts] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate reply drafts" },
      { status: 500 }
    );
  }
}

