// Graph Stats API
// app/api/graph/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGraphStats } from "@/lib/graph/api";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getGraphStats(userId);
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error("Failed to fetch graph stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




