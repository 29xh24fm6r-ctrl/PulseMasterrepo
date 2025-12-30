import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { completeTask } from "@/lib/data/tasks";
import { awardTaskXP } from "@/lib/xp/award";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, priority, taskName } = await request.json();

    if (!taskId) {
      return NextResponse.json({ ok: false, error: "taskId required" }, { status: 400 });
    }

    // Complete in Supabase
    await completeTask(userId, taskId);

    // Award XP (Standardized Logic)
    const xpResult = await awardTaskXP(userId, taskId, priority, taskName || "Completed Task");

    return NextResponse.json({
      ok: true,
      taskId,
      xp: {
        amount: xpResult.amount,
        category: xpResult.category,
        wasCrit: xpResult.wasCrit
      },
    });
  } catch (error: any) {
    console.error("Task complete error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
