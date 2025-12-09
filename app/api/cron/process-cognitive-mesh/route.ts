// API Route: GET /api/cron/process-cognitive-mesh
// Cron job to process unprocessed raw events

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ExtractionEngine } from "@/lib/cognitive-mesh/extraction-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with unprocessed events
    const { data: users } = await supabase
      .from("tb_raw_events")
      .select("user_id")
      .eq("processed", false)
      .limit(100);

    const uniqueUsers = [...new Set((users || []).map((u) => u.user_id))];

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each user's events
    for (const userId of uniqueUsers) {
      try {
        const result = await ExtractionEngine.processUnprocessedEvents(userId, 20);
        totalProcessed += result.processed;
        totalErrors += result.errors;
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        totalErrors++;
      }
    }

    console.log(
      `[Cognitive Mesh Cron] Processed ${totalProcessed} events, ${totalErrors} errors across ${uniqueUsers.length} users`
    );

    return NextResponse.json({
      success: true,
      users_processed: uniqueUsers.length,
      events_processed: totalProcessed,
      errors: totalErrors,
    });
  } catch (error: any) {
    console.error("[Cognitive Mesh Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
