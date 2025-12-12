// Weekly Life Arc Autopilot API
// app/api/life-arc/autopilot/weekly/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runWeeklyLifeArcAutopilotForUser, runAutopilotForAllUsers } from "@/lib/life-arc/autopilot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId: providedUserId, weekStartDate, forAllUsers } = body;

    if (forAllUsers) {
      // Cron mode - run for all users
      await runAutopilotForAllUsers("weekly");
      return NextResponse.json({ success: true, message: "Weekly autopilot run for all users" });
    }

    // Single user mode
    const { userId: authUserId } = await auth();
    const userId = providedUserId || authUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runWeeklyLifeArcAutopilotForUser(userId, weekStartDate);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LifeArcAutopilotWeekly] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to run weekly autopilot" },
      { status: 500 }
    );
  }
}




