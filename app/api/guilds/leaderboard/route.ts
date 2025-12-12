// Guild Leaderboard API
// app/api/guilds/leaderboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const jobNodeId = searchParams.get("jobNodeId");
    const fromDate = searchParams.get("from") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = searchParams.get("to") || new Date().toISOString().split("T")[0];

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // If no jobNodeId, use user's job
    let targetJobNodeId = jobNodeId;
    if (!targetJobNodeId) {
      const { data: jobProfile } = await supabaseAdmin
        .from("user_job_profiles")
        .select("job_node_id")
        .eq("user_id", dbUserId)
        .eq("is_active", true)
        .maybeSingle();

      targetJobNodeId = jobProfile?.job_node_id || null;
    }

    if (!targetJobNodeId) {
      return NextResponse.json({ error: "No job specified" }, { status: 400 });
    }

    // Get job info
    const { data: jobNode } = await supabaseAdmin
      .from("job_graph_nodes")
      .select("name, path")
      .eq("id", targetJobNodeId)
      .single();

    // Get all guilds for this job
    const { data: guilds } = await supabaseAdmin
      .from("guilds")
      .select("id, name, code")
      .eq("job_graph_node_id", targetJobNodeId);

    if (!guilds || guilds.length === 0) {
      return NextResponse.json({
        job: {
          nodeId: targetJobNodeId,
          label: jobNode?.name || null,
          path: jobNode?.path || null,
        },
        dateRange: { from: fromDate, to: toDate },
        guilds: [],
      });
    }

    // Get average scorecards for date range
    const { data: scorecards } = await supabaseAdmin
      .from("guild_scorecards")
      .select("guild_id, avg_score, member_count, date")
      .in("guild_id", guilds.map((g) => g.id))
      .gte("date", fromDate)
      .lte("date", toDate)
      .not("avg_score", "is", null);

    // Compute average for each guild
    const guildStats: Record<string, { scores: number[]; memberCount: number }> = {};
    for (const sc of scorecards || []) {
      if (!guildStats[sc.guild_id]) {
        guildStats[sc.guild_id] = { scores: [], memberCount: 0 };
      }
      guildStats[sc.guild_id].scores.push(sc.avg_score || 0);
      guildStats[sc.guild_id].memberCount = Math.max(
        guildStats[sc.guild_id].memberCount,
        sc.member_count || 0
      );
    }

    // Build leaderboard
    const leaderboard = guilds
      .map((guild) => {
        const stats = guildStats[guild.id];
        const avgScore = stats
          ? stats.scores.reduce((sum, s) => sum + s, 0) / stats.scores.length
          : null;

        return {
          guildId: guild.id,
          name: guild.name,
          code: guild.code,
          avgScore,
          memberCount: stats?.memberCount || 0,
        };
      })
      .filter((g) => g.avgScore !== null)
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
      .map((g, idx) => ({
        ...g,
        rank: idx + 1,
      }));

    return NextResponse.json({
      job: {
        nodeId: targetJobNodeId,
        label: jobNode?.name || null,
        path: jobNode?.path || null,
      },
      dateRange: { from: fromDate, to: toDate },
      guilds: leaderboard,
    });
  } catch (err: any) {
    console.error("[GuildLeaderboard] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get leaderboard" },
      { status: 500 }
    );
  }
}




