// Eligible Guilds API
// app/api/guilds/eligible/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getEligibleGuildsForUser } from "@/lib/guilds/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eligible = await getEligibleGuildsForUser(userId);

    return NextResponse.json({ guilds: eligible });
  } catch (err: any) {
    console.error("[GuildsEligible] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get eligible guilds" },
      { status: 500 }
    );
  }
}




