// Replan Day API
// app/api/productivity/replan/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { replanDay, adaptiveReplan } from "@/lib/productivity/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, trigger } = body;

    if (action === "replan") {
      const plan = await replanDay(userId);
      return NextResponse.json({ plan });
    }

    if (action === "adaptive" && trigger) {
      const result = await adaptiveReplan(userId, trigger);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'replan' or 'adaptive' with trigger" },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[Replan] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to replan";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



