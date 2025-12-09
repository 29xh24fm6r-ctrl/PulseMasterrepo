import { NextRequest, NextResponse } from "next/server";
import { runWeeklySummaries } from "@/lib/memory-compression/period";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWeeklySummaries();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Weekly cron failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;