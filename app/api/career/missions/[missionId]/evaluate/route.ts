// Mission Evaluation API
// app/api/career/missions/[missionId]/evaluate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { evaluateMissionCompletion } from "@/lib/career/missions";

export async function POST(
  req: NextRequest,
  { params }: { params: { missionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const missionId = params.missionId;

    const result = await evaluateMissionCompletion(missionId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[CareerMissionEval] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to evaluate mission" },
      { status: 500 }
    );
  }
}




