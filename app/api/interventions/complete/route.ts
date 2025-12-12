// Complete Intervention API
// app/api/interventions/complete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateInterventionExecution } from "@/lib/interventions/engine";
import { awardXP } from "@/lib/xp/award";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { executionId, completed } = body;

    if (!executionId || completed === undefined) {
      return NextResponse.json(
        { error: "executionId and completed are required" },
        { status: 400 }
      );
    }

    let xpAwarded = 0;
    if (completed) {
      // Award XP for completing intervention
      try {
        const result = await awardXP("coach_emotional_mastery", "intervention", {
          sourceId: executionId,
          notes: "Completed intervention",
          customMultiplier: 1.0,
        });
        xpAwarded = result.amount;
      } catch (err) {
        console.warn("[InterventionComplete] Failed to award XP:", err);
      }
    }

    await updateInterventionExecution(executionId, {
      completed,
      xpAwarded,
    });

    return NextResponse.json({
      success: true,
      xpAwarded,
    });
  } catch (err: any) {
    console.error("[InterventionComplete] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete intervention" },
      { status: 500 }
    );
  }
}

