// Join Guild API
// app/api/guilds/join/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { joinGuild } from "@/lib/guilds/engine";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { guildId } = body;

    if (!guildId) {
      return NextResponse.json({ error: "guildId required" }, { status: 400 });
    }

    const result = await joinGuild(userId, guildId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err: any) {
    console.error("[GuildsJoin] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to join guild" },
      { status: 500 }
    );
  }
}




