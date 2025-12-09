/**
 * Life Dashboard v3 API
 * GET /api/dashboard/v3 - Get complete dashboard data
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDashboardData } from "@/lib/dashboard/aggregator";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getDashboardData(userId);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Dashboard v3] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}