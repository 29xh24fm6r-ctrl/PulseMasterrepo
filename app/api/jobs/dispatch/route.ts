// app/api/jobs/dispatch/route.ts
// Sprint 4: Job dispatch endpoint (claims jobs for execution)
import "server-only";
import { NextResponse } from "next/server";
import { claimJobs } from "@/lib/server/jobs/claim";
import { requireJobsEnabled } from "@/lib/server/jobs/killswitch";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "job_dispatch" });

export const dynamic = "force-dynamic";

/**
 * POST /api/jobs/dispatch
 * 
 * Claims jobs from the queue for execution.
 * Service-role only (called by cron workers).
 * 
 * Body: { limit?: number }
 */
export async function POST(req: Request) {
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

    // Verify service role (in production, add proper auth check)
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!authHeader || !authHeader.includes(serviceRoleKey || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 10;

    const jobs = await claimJobs(limit);

    logger.info("Jobs claimed", { count: jobs.length, limit });

    return NextResponse.json({
      ok: true,
      claimed: jobs.map((j) => j.id),
      jobs_claimed: jobs.length,
      jobs: jobs.map((j) => ({
        id: j.id,
        job_type: j.job_type,
        user_id: j.user_id,
        attempts: j.attempts,
      })),
    });
  } catch (err: any) {
    logger.error("Job dispatch failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to dispatch jobs" },
      { status: 500 }
    );
  }
}

