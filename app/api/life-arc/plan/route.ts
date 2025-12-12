// Life Arc Plan API
// app/api/life-arc/plan/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getLifeArcPlan } from "@/lib/life-arc/planner";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await getLifeArcPlan(userId);

    return NextResponse.json({ plan });
  } catch (err: any) {
    console.error("[LifeArcPlan] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get life arc plan" },
      { status: 500 }
    );
  }
}




