// Autonomous Weekly Planning API
// app/api/weekly-plan/run/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateWeeklyPlan } from "@/lib/planning/weekly/v2/planner";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await generateWeeklyPlan(userId);

    return NextResponse.json(plan);
  } catch (err: unknown) {
    console.error("[Weekly Plan] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to generate weekly plan";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



