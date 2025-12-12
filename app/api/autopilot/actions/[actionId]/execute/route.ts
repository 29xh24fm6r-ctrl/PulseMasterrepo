// Autopilot Action Execute API
// app/api/autopilot/actions/[actionId]/execute/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { executeAutopilotAction } from "@/lib/autopilot/executors";

export async function POST(
  req: NextRequest,
  { params }: { params: { actionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actionId = params.actionId;

    const result = await executeAutopilotAction(actionId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Autopilot] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute action" },
      { status: 500 }
    );
  }
}




