// Deal Radar API
// app/api/deals/radar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDealRadarForUser } from "@/lib/deals/radar";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const radarItems = await getDealRadarForUser(userId, limit);

    return NextResponse.json(radarItems);
  } catch (err: any) {
    console.error("[DealRadar] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get deal radar" },
      { status: 500 }
    );
  }
}
