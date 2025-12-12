// Complete Life Arc Quest API
// app/api/life-arc/quests/[questId]/complete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { completeQuest } from "@/lib/life-arc/quests";

export async function POST(
  req: NextRequest,
  { params }: { params: { questId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const questId = params.questId;

    await completeQuest(questId);

    // Award XP (optional)
    try {
      const { awardXP } = await import("@/lib/xp/award");
      await awardXP(
        "life_arc_quest",
        "quest_completion",
        {
          sourceId: questId,
          notes: "Life arc quest completed",
        }
      );
    } catch (err) {
      // XP optional
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LifeArcQuestComplete] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete quest" },
      { status: 500 }
    );
  }
}




