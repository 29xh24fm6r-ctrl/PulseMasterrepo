// Daily Life Arc Autopilot API
// app/api/life-arc/autopilot/daily/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runDailyLifeArcAutopilotForUser, runAutopilotForAllUsers } from "@/lib/life-arc/autopilot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId: providedUserId, date, forAllUsers } = body;

    if (forAllUsers) {
      // Cron mode - run for all users
      await runAutopilotForAllUsers("daily");
      return NextResponse.json({ success: true, message: "Daily autopilot run for all users" });
    }

    // Single user mode
    const { userId: authUserId } = await auth();
    const userId = providedUserId || authUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runDailyLifeArcAutopilotForUser(userId, date);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LifeArcAutopilotDaily] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to run daily autopilot" },
      { status: 500 }
    );
  }
}




