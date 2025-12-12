// Graph Insights API
// app/api/graph/insights/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGraphInsights } from "@/lib/graph/api";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await getGraphInsights(userId);
    return NextResponse.json({ insights });
  } catch (err: any) {
    console.error("Failed to fetch graph insights:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




