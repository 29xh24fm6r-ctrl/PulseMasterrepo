// Nightly Job Scorecards Cron
// app/api/cron/nightly-job-scorecards/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeDailyJobScorecard } from "@/lib/jobs/scorecards";

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

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get unique user IDs
    const userIds = [...new Set(jobProfiles.map((p) => p.user_id))];

    let processed = 0;
    for (const userId of userIds) {
      try {
        // Get clerk_id from users table
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("clerk_id")
          .eq("id", userId)
          .single();

        if (user?.clerk_id) {
          await computeDailyJobScorecard(user.clerk_id, yesterday);
          processed++;
        }
      } catch (err) {
        console.error(`[JobScorecards] Failed for user ${userId}:`, err);
      }
    }

    return NextResponse.json({ processed });
  } catch (err: any) {
    console.error("[JobScorecards] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process scorecards" },
      { status: 500 }
    );
  }
}




