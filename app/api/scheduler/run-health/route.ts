import "server-only";
import { NextResponse } from "next/server";
import { requireAdminClerkUserId } from "@/lib/auth/admin";
import { runSchedulerHealthTick } from "@/lib/jobs/health-tick";
import { RunHealthRequest, RunHealthResponse } from "@/lib/contracts/admin-scheduler.contracts";
import { parseJsonBody, validateResponse } from "@/lib/contracts/contract-helpers";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "POST /api/scheduler/run-health" });

  try {
    await requireAdminClerkUserId();
    
    // ✅ Contract validation: parse request (may be empty for GET-like POST)
    const _body = await parseJsonBody(req, RunHealthRequest).catch(() => ({}));
    
    const result = await runSchedulerHealthTick();
    
    if (!result.ok) {
      log.error("route.err", { ...meta, route: "POST /api/scheduler/run-health", ms: Date.now() - t0, error: result.error });
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    // ✅ Contract validation: validate response shape
    const payload = {
      ok: true as const,
      ran: true,
      healthSnapshot: result.healthSnapshot,
      slaEscalation: result.slaEscalation,
      providerHealth: result.providerHealth,
      summary: {
        healthSnapshot: result.healthSnapshot,
        slaEscalation: result.slaEscalation,
        providerHealth: result.providerHealth,
      },
    };
    
    const validated = validateResponse(RunHealthResponse, payload);
    log.info("route.ok", { ...meta, route: "POST /api/scheduler/run-health", ms: Date.now() - t0 });
    return NextResponse.json(validated);
  } catch (e: any) {
    if (e instanceof Response) {
      log.warn("route.auth_failed", { ...meta, route: "POST /api/scheduler/run-health", ms: Date.now() - t0 });
      return e;
    }
    log.error("route.err", { ...meta, route: "POST /api/scheduler/run-health", ms: Date.now() - t0, error: e?.message ?? String(e) });
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

