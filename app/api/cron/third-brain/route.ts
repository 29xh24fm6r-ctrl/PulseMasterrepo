/**
 * Third Brain + Autonomy Daily Cycle Cron
 * GET /api/cron/third-brain
 * 
 * Runs the daily Third Brain cycle for all active users
 * Then runs the Autonomy cycle to generate suggested actions
 * Should be called once per day (e.g., 6 AM)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { runThirdBrainDailyCycle } from "@/lib/third-brain/service";
import { runAutonomyCycle } from "@/lib/autonomy/engine";

export const maxDuration = 300; // 5 minutes max for cron

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow bypass in development
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get all users who have been active in the last 7 days
    // (based on having events in third_brain_events)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeUsers, error } = await getSupabaseAdminRuntimeClient()
      .from("third_brain_events")
      .select("user_id")
      .gte("occurred_at", sevenDaysAgo.toISOString())
      .limit(1000);

    if (error) {
      console.error("[Cron] Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch active users" },
        { status: 500 }
      );
    }

    // Deduplicate user IDs
    const userIds = [...new Set(activeUsers?.map((u) => u.user_id) || [])];
    
    console.log(`[Cron] Processing ${userIds.length} active users`);

    const results = {
      usersProcessed: 0,
      // Third Brain stats
      totalEventsProcessed: 0,
      totalMemoriesUpdated: 0,
      totalInsightsGenerated: 0,
      // Autonomy stats
      totalActionsCreated: 0,
      totalActionsSkipped: 0,
      // Errors
      errors: [] as string[],
    };

    // Process each user
    for (const userId of userIds) {
      try {
        // Step 1: Run Third Brain cycle (generates insights)
        const thirdBrainResult = await runThirdBrainDailyCycle(userId);
        results.totalEventsProcessed += thirdBrainResult.eventsProcessed;
        results.totalMemoriesUpdated += thirdBrainResult.memoriesUpdated;
        results.totalInsightsGenerated += thirdBrainResult.insightsGenerated;

        // Step 2: Run Autonomy cycle (generates actions from insights)
        const autonomyResult = await runAutonomyCycle(userId);
        results.totalActionsCreated += autonomyResult.created;
        results.totalActionsSkipped += autonomyResult.skipped;

        results.usersProcessed++;
      } catch (err) {
        console.error(`[Cron] Error for user ${userId}:`, err);
        results.errors.push(userId);
      }
    }

    console.log("[Cron] Complete:", results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Fatal error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
