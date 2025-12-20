// app/api/simulation/runs/[runId]/rerun/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { runSimulationPaths } from "@/lib/simulation/server/runSimulationPaths";
import { makeRequestId, simLog } from "@/lib/simulation/server/log";
import { auditSimulationStart, auditSimulationFinish } from "@/lib/simulation/server/audit";
import { requireSimulationEnabled, checkRateLimit } from "@/lib/simulation/server/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/simulation/runs/:runId/rerun
 * Replays the exact inputs of a prior run (same mode/deal/pathIds/input).
 * Returns a fresh result and (your existing auditing middleware/route logic will record it).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> | { runId: string } }
) {
  const requestId = makeRequestId();
  const log = simLog(requestId);
  const startedAt = Date.now();
  let auditId: string | null = null;

  try {
    // Environment guard
    requireSimulationEnabled();

    const clerkUserId = await requireClerkUserId();

    const resolvedParams = params instanceof Promise ? await params : params;
    const runId = resolvedParams.runId;

    if (!runId) {
      return NextResponse.json({ ok: false, error: "Missing runId" }, { status: 400 });
    }

    // Resolve to database user ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();

    const dbUserId = userRow?.id || clerkUserId;

    // Rate limit
    checkRateLimit(clerkUserId);

    log.info("Rerun requested", { userId: clerkUserId, originalRunId: runId });

    const { data: run, error } = await supabaseAdmin
      .from("simulation_runs")
      .select("id,user_id,route,mode,deal_id,path_ids,input")
      .eq("id", runId)
      .eq("user_id", dbUserId)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!run) return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });

    const mode = (run.mode === "single" || run.mode === "all") ? run.mode : "all";

    log.info("Replaying run", { mode, dealId: run.deal_id, pathIds: run.path_ids });

    // Start audit trail
    auditId = await auditSimulationStart({
      userId: clerkUserId,
      requestId,
      route: "/api/simulation/runs/[runId]/rerun",
      mode,
      dealId: run.deal_id ?? null,
      pathIds: mode === "single" ? (run.path_ids ?? null) : null,
      input: (run.input ?? {}) as any,
    });

    // Run simulation
    const result = await runSimulationPaths({
      userId: clerkUserId,
      mode,
      dealId: run.deal_id ?? null,
      pathIds: mode === "single" ? (run.path_ids ?? null) : null,
      input: (run.input ?? {}) as any,
      requestId,
      route: "/api/simulation/runs/[runId]/rerun",
    });

    const durationMs = Date.now() - startedAt;
    log.info("Rerun completed", { durationMs, resultId: result.id });

    // Update audit trail
    if (auditId) {
      await auditSimulationFinish(auditId, {
        status: "finished",
        finishedAt: new Date().toISOString(),
        durationMs,
        result,
      });
    }

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = err?.message || "Rerun failed";
    const status = err?.status || 500;

    log.error("Rerun failed", { error: errorMessage, status, durationMs });

    // Update audit trail if we have an ID
    if (auditId) {
      try {
        await auditSimulationFinish(auditId, {
          status: "failed",
          finishedAt: new Date().toISOString(),
          durationMs,
          error: errorMessage,
        });
      } catch (auditErr) {
        log.error("Failed to update audit trail", { error: auditErr });
      }
    }

    return NextResponse.json({ ok: false, error: errorMessage }, { status });
  }
}

