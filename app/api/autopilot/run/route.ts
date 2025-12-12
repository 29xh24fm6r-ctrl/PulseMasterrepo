// Autopilot Run API
// app/api/autopilot/run/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runAutopilotScan } from "@/lib/autopilot/orchestrator";
import { AutopilotMode } from "@/lib/autopilot/types";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mode } = body;

    const result = await runAutopilotScan(userId, mode as AutopilotMode | undefined);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Autopilot] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to run autopilot scan" },
      { status: 500 }
    );
  }
}




