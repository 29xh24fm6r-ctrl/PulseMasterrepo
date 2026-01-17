/**
 * Pulse Daily/Weekly Cron
 * GET /api/cron/pulse
 * 
 * Runs:
 * - Daily: Third Brain cycle, Autonomy cycle
 * - Weekly (Sundays): Executive summary generation
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { runThirdBrainDailyCycle } from "@/lib/third-brain/service";
import { runAutonomyCycle } from "@/lib/autonomy/engine";
import { recomputeDomainKPIs, generateExecutiveSummary } from "@/lib/executive/engine";

export const maxDuration = 300; // 5 minutes max

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const isWeeklyRun = dayOfWeek === 0; // Run weekly tasks on Sunday

    // Get active users (events in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeUsers, error } = await getSupabaseAdminRuntimeClient()
      .from("third_brain_events")
      .select("user_id")
      .gte("occurred_at", sevenDaysAgo.toISOString())
      .limit(1000);

    if (error) {
      console.error("[Cron] Error fetching users:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const userIds = [...new Set(activeUsers?.map((u) => u.user_id) || [])];
    
    console.log(`[Cron] Processing ${userIds.length} users. Weekly run: ${isWeeklyRun}`);

    const results = {
      usersProcessed: 0,
      // Third Brain
      totalEventsProcessed: 0,
      totalMemoriesUpdated: 0,
      totalInsightsGenerated: 0,
      // Autonomy
      totalActionsCreated: 0,
      // Executive (weekly only)
      executiveSummariesGenerated: 0,
      // Errors
      errors: [] as string[],
    };

    for (const userId of userIds) {
      try {
        // === DAILY TASKS ===
        
        // 1. Third Brain cycle
        const tbResult = await runThirdBrainDailyCycle(userId);
        results.totalEventsProcessed += tbResult.eventsProcessed;
        results.totalMemoriesUpdated += tbResult.memoriesUpdated;
        results.totalInsightsGenerated += tbResult.insightsGenerated;

        // 2. Autonomy cycle
        const autoResult = await runAutonomyCycle(userId);
        results.totalActionsCreated += autoResult.created;

        // === WEEKLY TASKS (Sunday only) ===
        if (isWeeklyRun) {
          try {
            // Calculate last week's date range
            const weekEnd = new Date();
            weekEnd.setHours(23, 59, 59, 999);
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekStart.getDate() - 7);
            weekStart.setHours(0, 0, 0, 0);

            // Recompute KPIs
            await recomputeDomainKPIs({
              userId,
              startDate: weekStart,
              endDate: weekEnd,
            });

            // Generate executive summary
            await generateExecutiveSummary(userId, {
              start: weekStart,
              end: weekEnd,
            });

            results.executiveSummariesGenerated++;
          } catch (execErr) {
            console.error(`[Cron] Executive error for ${userId}:`, execErr);
          }
        }

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
      isWeeklyRun,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Fatal error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}