// Autopilot Policy API
// app/api/autopilot/policy/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAutopilotPolicy, updateAutopilotPolicy } from "@/lib/autopilot/policy";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policy = await getAutopilotPolicy(userId);

    return NextResponse.json(policy);
  } catch (err: any) {
    console.error("[Autopilot] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get policy" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const policy = await updateAutopilotPolicy(userId, body);

    return NextResponse.json(policy);
  } catch (err: any) {
    console.error("[Autopilot] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update policy" },
      { status: 500 }
    );
  }
}




