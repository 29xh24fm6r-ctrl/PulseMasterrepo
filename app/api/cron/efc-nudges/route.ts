// API Route: GET /api/cron/efc-nudges
// Daily cron job to generate nudges for all users

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FollowThroughTracker } from "@/lib/efc/follow-through-tracker";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with active commitments
    const { data: users } = await supabase
      .from("efc_commitments")
      .select("user_id")
      .eq("status", "active");

    const uniqueUsers = [...new Set((users || []).map((u) => u.user_id))];

    let totalNudges = 0;
    let usersProcessed = 0;

    for (const userId of uniqueUsers) {
      try {
        const nudges = await FollowThroughTracker.generateNudgesForUser(userId);
        totalNudges += nudges.length;
        usersProcessed++;
      } catch (error) {
        console.error(`Error generating nudges for user ${userId}:`, error);
      }
    }

    console.log(
      `[EFC Nudges Cron] Generated ${totalNudges} nudges for ${usersProcessed} users`
    );

    return NextResponse.json({
      success: true,
      users_processed: usersProcessed,
      nudges_generated: totalNudges,
    });
  } catch (error: any) {
    console.error("[EFC Nudges Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;