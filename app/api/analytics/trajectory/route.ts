// Life Trajectory Analytics API
// app/api/analytics/trajectory/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") || "90");

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get coaching turns for emotion counts
    const { data: sessions } = await supabaseAdmin
      .from("coaching_sessions")
      .select("id")
      .eq("user_id", dbUserId);

    const sessionIds = (sessions || []).map((s) => s.id);

    let turns: any[] = [];
    if (sessionIds.length > 0) {
      const { data: turnsData } = await supabaseAdmin
        .from("coaching_turns")
        .select("emotion, created_at")
        .in("session_id", sessionIds)
        .gte("created_at", cutoffDate.toISOString());

      turns = turnsData || [];
    }

    // Get MXP per day
    const { data: xpRecords } = await supabaseAdmin
      .from("xp_ledger")
      .select("amount, created_at")
      .eq("user_id", dbUserId)
      .eq("category", "MXP")
      .gte("created_at", cutoffDate.toISOString());

    // Get sessions per day
    const { data: sessionsData } = await supabaseAdmin
      .from("coaching_sessions")
      .select("started_at")
      .eq("user_id", dbUserId)
      .gte("started_at", cutoffDate.toISOString());

    // Get identity snapshots for top identity
    const { data: snapshots } = await supabaseAdmin
      .from("identity_state_snapshots")
      .select("snapshot_date, identity_name, xp_total")
      .eq("user_id", dbUserId)
      .gte("snapshot_date", cutoffDate.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true });

    // Aggregate by date
    const dailyData = new Map<string, any>();

    // Initialize all dates in range
    for (let i = 0; i < days; i++) {
      const date = new Date(cutoffDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];
      dailyData.set(dateKey, {
        date: dateKey,
        stressCount: 0,
        calmCount: 0,
        mxpEarned: 0,
        sessionsCount: 0,
        topIdentityName: null,
        topIdentityXP: 0,
      });
    }

    // Process turns
    turns.forEach((turn) => {
      const date = new Date(turn.created_at).toISOString().split("T")[0];
      const data = dailyData.get(date);
      if (data) {
        const emotion = turn.emotion?.toLowerCase();
        if (emotion === "stress" || emotion === "anxious" || emotion === "overwhelmed") {
          data.stressCount++;
        }
        if (emotion === "calm" || emotion === "stabilize") {
          data.calmCount++;
        }
      }
    });

    // Process XP
    (xpRecords || []).forEach((xp) => {
      const date = new Date(xp.created_at).toISOString().split("T")[0];
      const data = dailyData.get(date);
      if (data) {
        data.mxpEarned += xp.amount || 0;
      }
    });

    // Process sessions
    (sessionsData || []).forEach((session) => {
      const date = new Date(session.started_at).toISOString().split("T")[0];
      const data = dailyData.get(date);
      if (data) {
        data.sessionsCount++;
      }
    });

    // Process identity snapshots
    const identityByDate = new Map<string, { name: string; xp: number }>();
    (snapshots || []).forEach((snapshot) => {
      const existing = identityByDate.get(snapshot.snapshot_date);
      if (!existing || snapshot.xp_total > existing.xp) {
        identityByDate.set(snapshot.snapshot_date, {
          name: snapshot.identity_name || "Unknown",
          xp: snapshot.xp_total || 0,
        });
      }
    });

    identityByDate.forEach((identity, date) => {
      const data = dailyData.get(date);
      if (data) {
        data.topIdentityName = identity.name;
        data.topIdentityXP = identity.xp;
      }
    });

    const points = Array.from(dailyData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({ points });
  } catch (err: any) {
    console.error("[Trajectory] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get trajectory" },
      { status: 500 }
    );
  }
}

