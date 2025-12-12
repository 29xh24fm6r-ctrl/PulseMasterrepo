// Current Strategy API
// app/api/strategy/current/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentStrategy } from "@/lib/strategy/api";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const horizonDays = parseInt(searchParams.get("horizonDays") || "90");

    const strategy = await getCurrentStrategy(userId, horizonDays);

    if (!strategy) {
      return NextResponse.json({ strategy: null });
    }

    return NextResponse.json({ strategy });
  } catch (err: any) {
    console.error("[StrategyCurrent] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get current strategy" },
      { status: 500 }
    );
  }
}




