// app/api/simulation/paths/run/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { runSimulationPaths } from "@/lib/simulation/server/runSimulationPaths";
import { SimRunRequestSchema, SimRunResponseSchema, SIM_CONTRACT_VERSION } from "@/lib/simulation/contracts";
import { z } from "zod";
import { makeRequestId, simLog } from "@/lib/simulation/server/log";
import { auditSimulationStart, auditSimulationFinish } from "@/lib/simulation/server/audit";
import { requireSimulationEnabled, checkRateLimit } from "@/lib/simulation/server/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = makeRequestId();
  const log = simLog(requestId);
  const startedAt = Date.now();
  let auditId: string | null = null;

  try {
    // Environment guard
    requireSimulationEnabled();

    // Auth
    const clerkUserId = await requireClerkUserId();
    log.info("Simulation run requested", { userId: clerkUserId });

    // Rate limit
    checkRateLimit(clerkUserId);

    // Parse and validate request
    const body = await req.json().catch(() => ({}));
    
    // Support both scenarioId (new) and direct input (legacy)
    let validated: z.infer<typeof SimRunRequestSchema>;
    
    if (body.scenarioId) {
      // New format: use scenario registry
      const { getScenarioById } = await import("@/lib/simulation/server/runSimulationPaths");
      const scenario = getScenarioById(body.scenarioId);
      
      if (!scenario) {
        throw new Error(`Unknown scenario: ${body.scenarioId}`);
      }
      
      validated = SimRunRequestSchema.parse({
        mode: scenario.mode,
        dealId: scenario.dealId ?? null,
        pathIds: scenario.mode === "single" ? (scenario.pathIds ?? null) : null,
        input: scenario.input ?? {},
      });
    } else {
      // Legacy format: direct input
      validated = SimRunRequestSchema.parse({
        ...body,
        input: body?.input ?? {},
        options: body?.options ?? {},
      });
    }

    log.info("Request validated", { mode: validated.mode, dealId: validated.dealId, scenarioId: body.scenarioId });

    // Start audit trail
    auditId = await auditSimulationStart({
      userId: clerkUserId,
      requestId,
      route: "/api/simulation/paths/run",
      mode: validated.mode,
      dealId: validated.dealId,
      pathIds: validated.pathIds,
      input: validated.input,
    });

    // Run simulation
    log.info("Starting simulation execution");
    const result = await runSimulationPaths({
      userId: clerkUserId,
      mode: validated.mode,
      dealId: validated.dealId,
      pathIds: validated.pathIds,
      input: validated.input,
      requestId, // Pass for logging
      route: "/api/simulation/paths/run",
    });

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

    // Return typed response
    const response: z.infer<typeof SimRunResponseSchema> = {
      ok: true,
      contract_version: SIM_CONTRACT_VERSION,
      request_id: requestId,
      result,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = err?.message ?? "Simulation run failed";
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

    const response: z.infer<typeof SimRunResponseSchema> = {
      ok: false,
      contract_version: SIM_CONTRACT_VERSION,
      request_id: requestId,
      error: errorMessage,
    };

    return NextResponse.json(response, { status });
  }
}
