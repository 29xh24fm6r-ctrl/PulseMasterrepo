// Finance Overview API
// app/api/finance/overview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFinanceOverview } from "@/lib/finance/api";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const overview = await getFinanceOverview(userId);
    return NextResponse.json(overview);
  } catch (err: any) {
    console.error("[FinanceOverview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get finance overview" },
      { status: 500 }
    );
  }
}




