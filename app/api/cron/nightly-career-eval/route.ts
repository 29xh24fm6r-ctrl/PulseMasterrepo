// Nightly Career Evaluation Cron
// app/api/cron/nightly-career-eval/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { evaluateCareerProgressForUser } from "@/lib/career/progress";
import { evaluateMissionCompletion } from "@/lib/career/missions";

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
    let promoted = 0;

    for (const userId of userIds) {
      try {
        // Get clerk_id from users table
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("clerk_id")
          .eq("id", userId)
          .single();

        if (user?.clerk_id) {
          const result = await evaluateCareerProgressForUser(
            user.clerk_id,
            yesterday
          );
          if (result.promoted) {
            promoted++;
          }

          // Also evaluate missions for yesterday
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          const { data: missions } = await supabaseAdmin
            .from("user_career_missions")
            .select("id")
            .eq("user_id", userId)
            .eq("assigned_date", yesterdayStr)
            .in("status", ["assigned", "in_progress"]);

          for (const mission of missions || []) {
            try {
              await evaluateMissionCompletion(mission.id);
            } catch (err) {
              console.error(`[CareerEval] Mission eval failed for ${mission.id}:`, err);
            }
          }

          processed++;
        }
      } catch (err) {
        console.error(`[CareerEval] Failed for user ${userId}:`, err);
      }
    }

    return NextResponse.json({ processed, promoted });
  } catch (err: any) {
    console.error("[CareerEval] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process career evaluations" },
      { status: 500 }
    );
  }
}

