// routes/cron_intelligence.ts
// POST /cron/intelligence — triggered by Cloud Scheduler (OIDC).
// Runs the full intelligence pipeline for the default target user.
// Always returns 200. Never throws. Fully observer-logged.

import type { Request, Response } from "express";
import { runIntelligence } from "../intelligence/run.js";

/**
 * Handler for POST /cron/intelligence.
 * Auth: OIDC (handled at Cloud Run ingress level).
 * Wraps entire execution in try/catch — always returns 200.
 */
export async function handleCronIntelligence(
  req: Request,
  res: Response,
): Promise<void> {
  const targetUserId = process.env.PULSE_DEFAULT_TARGET_USER_ID?.trim();

  if (!targetUserId) {
    console.log("[pulse-mcp] /cron/intelligence: no PULSE_DEFAULT_TARGET_USER_ID set");
    res.status(200).json({
      ok: false,
      generated: { signals: 0, intents: 0, proposals: 0 },
      errors: ["PULSE_DEFAULT_TARGET_USER_ID not configured"],
    });
    return;
  }

  console.log("[pulse-mcp] /cron/intelligence: starting", {
    userId: targetUserId,
    source: req.body?.source ?? "cloud-scheduler",
    ts: new Date().toISOString(),
  });

  try {
    const result = await runIntelligence(targetUserId);

    console.log("[pulse-mcp] /cron/intelligence: complete", {
      signals: result.generated.signals,
      intents: result.generated.intents,
      proposals: result.generated.proposals,
      errors: result.errors.length,
    });

    res.status(200).json(result);
  } catch (e: any) {
    // This should never happen (runIntelligence never throws),
    // but belt-and-suspenders.
    console.error("[pulse-mcp] /cron/intelligence: unexpected error", e);
    res.status(200).json({
      ok: false,
      generated: { signals: 0, intents: 0, proposals: 0 },
      errors: [e?.message ?? "Unexpected error"],
    });
  }
}
