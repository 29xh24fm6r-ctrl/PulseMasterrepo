// Nightly Guild Scorecards Cron
// app/api/cron/nightly-guild-scorecards/route.ts

import { NextRequest, NextResponse } from "next/server";
import { computeGuildScorecards } from "@/lib/guilds/engine";

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret if needed
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await computeGuildScorecards(yesterday);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[GuildScorecards] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to compute guild scorecards" },
      { status: 500 }
    );
  }
}




