// app/api/jobs/execute/route.ts
// Sprint 4: Job execution endpoint (executes a single job safely)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { executeJob } from "@/lib/server/jobs/execute";
import { requireJobsEnabled } from "@/lib/server/jobs/killswitch";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "job_execute" });

export const dynamic = "force-dynamic";

/**
 * POST /api/jobs/execute
 * 
 * Executes a single job safely.
 * Service-role only (called by cron workers).
 * 
 * Body: { job_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Kill switch check
    try {
      requireJobsEnabled();
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 503 }
      );
    }

    // Verify service role
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!authHeader || !authHeader.includes(serviceRoleKey || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { job_id } = body;

    if (!job_id) {
      return NextResponse.json({ error: "job_id is required" }, { status: 400 });
    }

    // Check if job exists and is in running status
    const { data: job, error: fetchError } = await supabaseAdmin
      .from("job_queue")
      .select("status")
      .eq("id", job_id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "running") {
      return NextResponse.json(
        { error: `Job is not running (status: ${job.status})` },
        { status: 409 }
      );
    }

    // Execute job
    const result = await executeJob(job_id);

    if (result.success) {
      return NextResponse.json({
        ok: true,
        status: "succeeded",
        result: result.result,
      });
    } else {
      // Check if job was requeued or dead-lettered
      const { data: updatedJob } = await supabaseAdmin
        .from("job_queue")
        .select("status")
        .eq("id", job_id)
        .single();

      const status = updatedJob?.status === "dead_letter" ? "dead_letter" : "requeued";

      return NextResponse.json({
        ok: false,
        status,
        error: result.error,
      }, { status: 500 });
    }
  } catch (err: any) {
    logger.error("Job execute endpoint failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to execute job" },
      { status: 500 }
    );
  }
}
