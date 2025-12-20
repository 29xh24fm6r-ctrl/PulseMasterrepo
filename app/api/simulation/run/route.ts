// Simulation Run API
// app/api/simulation/run/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { runSimulationScenario } from "@/lib/simulation/server/runSimulationPaths";
import { makeRequestId, simLog } from "@/lib/simulation/server/log";
import { auditSimulationStart, auditSimulationFinish } from "@/lib/simulation/server/audit";
import { requireSimulationEnabled, checkRateLimit } from "@/lib/simulation/server/guards";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SimRunLegacySchema = z.object({
  scenarioName: z.string().min(1),
  input: z.record(z.any()),
});

export async function POST(req: NextRequest) {
  const requestId = makeRequestId();
  const log = simLog(requestId);
  const startedAt = Date.now();
  let auditId: string | null = null;

  try {
    // Environment guard
    requireSimulationEnabled();

    // Auth
    const userId = await requireClerkUserId();
    log.info("Legacy simulation run requested", { userId });

    // Rate limit
    checkRateLimit(userId);

    // Parse and validate request
    const body = await req.json();
    const validated = SimRunLegacySchema.parse(body);

    log.info("Request validated", { scenarioName: validated.scenarioName });

    // Normalize input to SimulationInput format
    const simulationInput: typeof import("../scenario").SimulationInput = {
      days: validated.input?.days || 90,
      adjustments: validated.input?.adjustments || {},
    };

    // Start audit trail
    auditId = await auditSimulationStart({
      userId,
      requestId,
      route: "/api/simulation/run",
      mode: "all",
      dealId: null,
      pathIds: null,
      input: { ...validated.input, scenarioName: validated.scenarioName },
    });

    // Run simulation
    log.info("Starting simulation execution");
    const result = await runSimulationScenario(userId, validated.scenarioName, simulationInput);

    const durationMs = Date.now() - startedAt;
    log.info("Simulation completed", { durationMs, resultId: result.id });

    // Update audit trail
    if (auditId) {
      await auditSimulationFinish(auditId, {
        status: "finished",
        finishedAt: new Date().toISOString(),
        durationMs,
        result,
      });
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = err?.message || "Failed to run simulation";
    const status = err?.status || 500;

    log.error("Simulation failed", { error: errorMessage, status, durationMs });

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

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
