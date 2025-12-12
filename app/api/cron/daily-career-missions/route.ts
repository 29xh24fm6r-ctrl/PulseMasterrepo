// Daily Career Missions Cron
// app/api/cron/daily-career-missions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { assignDailyCareerMissions } from "@/lib/career/missions";

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret if needed
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with active job profiles
    const { data: jobProfiles } = await supabaseAdmin
      .from("user_job_profiles")
      .select("user_id")
      .eq("is_active", true);

    if (!jobProfiles || jobProfiles.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    // Get unique user IDs
    const userIds = [...new Set(jobProfiles.map((p) => p.user_id))];

    let processed = 0;
    const today = new Date();

    for (const userId of userIds) {
      try {
        // Get clerk_id from users table
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("clerk_id")
          .eq("id", userId)
          .single();

        if (user?.clerk_id) {
          await assignDailyCareerMissions(user.clerk_id, today);
          processed++;
        }
      } catch (err) {
        console.error(`[CareerMissions] Failed for user ${userId}:`, err);
      }
    }

    return NextResponse.json({ processed });
  } catch (err: any) {
    console.error("[CareerMissions] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to assign missions" },
      { status: 500 }
    );
  }
}




