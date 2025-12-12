// Societal Insights API - GET /api/society/insights
// app/api/society/insights/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildSocietalInsightsForUser } from "@/lib/societal/insights";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await buildSocietalInsightsForUser(userId);

    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error("Failed to fetch insights:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



