// Meeting Briefing API
// app/api/meetings/[eventId]/briefing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateMeetingBriefingForEvent } from "@/lib/meetings/briefing";

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = params.eventId;

    const briefing = await generateMeetingBriefingForEvent(userId, eventId);

    return NextResponse.json(briefing);
  } catch (err: any) {
    console.error("[MeetingBriefing] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate meeting briefing" },
      { status: 500 }
    );
  }
}




