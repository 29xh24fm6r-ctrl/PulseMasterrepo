// My Guilds API
// app/api/guilds/my/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get user's guild memberships
    const { data: memberships } = await supabaseAdmin
      .from("user_guild_memberships")
      .select("*, guilds(*)")
      .eq("user_id", dbUserId);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ memberships: [], scorecards: [] });
    }

    // Get today's scorecards for user's guilds
    const today = new Date().toISOString().split("T")[0];
    const guildIds = memberships.map((m) => m.guild_id);

    const { data: scorecards } = await supabaseAdmin
      .from("guild_scorecards")
      .select("*")
      .in("guild_id", guildIds)
      .eq("date", today);

    return NextResponse.json({
      memberships: memberships.map((m) => ({
        id: m.id,
        guildId: m.guild_id,
        guild: m.guilds,
        joinedAt: m.joined_at,
        role: m.role,
      })),
      scorecards: scorecards || [],
    });
  } catch (err: any) {
    console.error("[GuildsMy] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get my guilds" },
      { status: 500 }
    );
  }
}




