// Nightly Contact Behavior Cron Endpoint
// app/api/cron/nightly-contact-behavior/route.ts

import { NextRequest, NextResponse } from "next/server";
import { runNightlyContactBehaviorJob } from "@/lib/jobs/nightly-contact-behavior-job";

export async function GET(req: NextRequest) {
  try {
    // Optional: Add auth check or cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runNightlyContactBehaviorJob();

    return NextResponse.json({ success: true, message: "Contact behavior recompute completed" });
  } catch (err: any) {
    console.error("[NightlyContactBehaviorCron] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to run contact behavior job" },
      { status: 500 }
    );
  }
}

