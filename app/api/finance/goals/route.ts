// Finance Goals API
// app/api/finance/goals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserGoals, upsertGoal } from "@/lib/finance/goals";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goals = await getUserGoals(userId);
    return NextResponse.json({ goals });
  } catch (err: any) {
    console.error("[FinanceGoals] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get goals" },
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
    const goal = await upsertGoal(userId, body);
    return NextResponse.json({ goal });
  } catch (err: any) {
    console.error("[FinanceGoals] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create/update goal" },
      { status: 500 }
    );
  }
}




