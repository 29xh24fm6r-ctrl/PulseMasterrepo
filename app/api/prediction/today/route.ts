// Today's Predictions API
// app/api/prediction/today/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTodayPredictions } from "@/lib/prediction/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const predictions = await getTodayPredictions(userId);

    return NextResponse.json({ predictions });
  } catch (err: any) {
    console.error("[PredictionToday] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get predictions" },
      { status: 500 }
    );
  }
}

