// app/api/cron/tick/route.ts
// Sprint 4: Cron entry point (dispatches jobs)
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { claimJobs } from "@/lib/server/jobs/claim";
import { executeJob } from "@/lib/server/jobs/execute";
import { requireJobsEnabled } from "@/lib/server/jobs/killswitch";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "cron_tick" });

export const dynamic = "force-dynamic";

const MAX_JOBS_PER_TICK = 25;
const MAX_TICK_DURATION_MS = 30000; // 30 seconds

/**
 * GET /api/cron/tick
 * 
 * Cron entry point that:
 * 1. Claims jobs from queue
 * 2. Executes each job
 * 
 * Called by external cron service (Vercel Cron, etc.)
 * 
 * Query params:
 * - limit: max jobs to process (default: 10, max: 25)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
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

    // Verify cron secret (in production, use proper auth)
    const cronSecret = req.headers.get("authorization") || req.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "10", 10),
      MAX_JOBS_PER_TICK
    );

    logger.info("Cron tick started", { limit });

    // Claim jobs
    const jobs = await claimJobs(limit);

    if (jobs.length === 0) {
      logger.info("No jobs to process");
      return NextResponse.json({
        ok: true,
        claimed: 0,
        succeeded: 0,
        failed: 0,
        dead_letter: 0,
        message: "No jobs to process",
      });
    }

    logger.info("Jobs claimed", { count: jobs.length });

    // Execute each job sequentially (with timeout safety)
    const results = [];
    let succeeded = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const job of jobs) {
      // Check timeout
      if (Date.now() - startTime > MAX_TICK_DURATION_MS) {
        logger.warn("Cron tick timeout reached, stopping execution", {
          processed: results.length,
          remaining: jobs.length - results.length,
        });
        break;
      }

      try {
        const result = await executeJob(job.id);
        
        if (result.success) {
          succeeded++;
          results.push({
            job_id: job.id,
            job_type: job.job_type,
            status: "succeeded",
          });
        } else {
          // Check if dead-lettered
          const { data: updatedJob } = await supabaseAdmin
            .from("job_queue")
            .select("status")
            .eq("id", job.id)
            .single();

          if (updatedJob?.status === "dead_letter") {
            deadLetter++;
            results.push({
              job_id: job.id,
              job_type: job.job_type,
              status: "dead_letter",
              error: result.error,
            });
          } else {
            failed++;
            results.push({
              job_id: job.id,
              job_type: job.job_type,
              status: "requeued",
              error: result.error,
            });
          }
        }
      } catch (err: any) {
        logger.error("Failed to execute job", err, { job_id: job.id });
        failed++;
        results.push({
          job_id: job.id,
          job_type: job.job_type,
          status: "failed",
          error: err.message,
        });
      }
    }

    logger.info("Cron tick completed", {
      claimed: jobs.length,
      succeeded,
      failed,
      dead_letter: deadLetter,
    });

    return NextResponse.json({
      ok: true,
      claimed: jobs.length,
      succeeded,
      failed,
      dead_letter: deadLetter,
      results,
    });
  } catch (err: any) {
    logger.error("Cron tick failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Cron tick failed" },
      { status: 500 }
    );
  }
}
