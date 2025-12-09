/**
 * Cron Jobs Handler
 * POST /api/cron - Execute scheduled tasks
 * 
 * Call from Vercel Cron or external scheduler with secret
 */

import { NextRequest, NextResponse } from "next/server";
import { processDueCampaignSteps } from "@/lib/campaigns/engine";
import { processNotificationQueue, sendMorningDigest, sendEveningDigest } from "@/lib/notifications/advanced";
import { recalculateHealthScores } from "@/lib/relationships/engine";
import { detectPatterns } from "@/lib/memory/engine";
import { supabaseAdmin } from "@/lib/supabase";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Verify secret
    const authHeader = req.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { job } = body;

    const results: Record<string, any> = { job, timestamp: new Date().toISOString() };

    switch (job) {
      case "morning-digest": {
        // Send morning digests to all users with notifications enabled
        const users = await getUsersWithNotifications();
        let sent = 0;
        for (const userId of users) {
          const success = await sendMorningDigest(userId);
          if (success) sent++;
        }
        results.sent = sent;
        results.totalUsers = users.length;
        break;
      }

      case "evening-digest": {
        const users = await getUsersWithNotifications();
        let sent = 0;
        for (const userId of users) {
          const success = await sendEveningDigest(userId);
          if (success) sent++;
        }
        results.sent = sent;
        results.totalUsers = users.length;
        break;
      }

      case "process-campaigns": {
        const campaignResults = await processDueCampaignSteps();
        results.campaigns = campaignResults;
        break;
      }

      case "process-notifications": {
        const notifResults = await processNotificationQueue();
        results.notifications = notifResults;
        break;
      }

      case "relationship-health": {
        const users = await getAllUsers();
        let updated = 0;
        for (const userId of users) {
          updated += await recalculateHealthScores(userId);
        }
        results.relationshipsUpdated = updated;
        break;
      }

      case "detect-patterns": {
        const users = await getAllUsers();
        let patternsFound = 0;
        for (const userId of users) {
          const patterns = await detectPatterns(userId);
          patternsFound += patterns.length;
        }
        results.patternsFound = patternsFound;
        break;
      }

      case "cleanup": {
        // Clean up expired data
        const now = new Date().toISOString();
        
        // Remove expired notifications
        await supabaseAdmin
          .from("notification_queue")
          .delete()
          .lt("expires_at", now)
          .eq("status", "queued");

        // Remove old sent notifications (30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from("notification_queue")
          .delete()
          .lt("created_at", thirtyDaysAgo)
          .eq("status", "sent");

        results.cleanup = "completed";
        break;
      }

      case "daily-all": {
        // Run all daily jobs
        const dailyResults: Record<string, any> = {};

        // Process campaigns
        dailyResults.campaigns = await processDueCampaignSteps();

        // Process notification queue
        dailyResults.notifications = await processNotificationQueue();

        // Update relationship health
        const users = await getAllUsers();
        let relUpdated = 0;
        for (const userId of users) {
          relUpdated += await recalculateHealthScores(userId);
        }
        dailyResults.relationshipsUpdated = relUpdated;

        results.daily = dailyResults;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown job" }, { status: 400 });
    }


    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error("[Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also support GET for Vercel Cron
export async function GET(req: NextRequest) {
  const job = req.nextUrl.searchParams.get("job");
  if (!job) {
    return NextResponse.json({ error: "Missing job parameter" }, { status: 400 });
  }

  // Create a fake request body
  const fakeReq = {
    headers: req.headers,
    json: async () => ({ job }),
  } as NextRequest;

  return POST(fakeReq);
}

// Helper functions
async function getUsersWithNotifications(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("notification_preferences")
    .select("user_id")
    .eq("push_enabled", true);

  return (data || []).map((d) => d.user_id);
}

async function getAllUsers(): Promise<string[]> {
  // Get unique users from various tables
  const { data } = await supabaseAdmin
    .from("relationships")
    .select("user_id")
    .limit(1000);

  const users = new Set<string>();
  (data || []).forEach((d) => users.add(d.user_id));

  return Array.from(users);
}