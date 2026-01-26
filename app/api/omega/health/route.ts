// app/api/omega/health/route.ts
// Canon Gate helper: Health check endpoint for Omega trust infrastructure

export const runtime = "nodejs";

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import {
  getUserAutonomyLevel,
  checkConstraintsWithEscalation,
  getAutonomyLevelDescriptions,
} from "@/lib/omega/autonomy";
import {
  getCalibrationData,
  getRecentConfidenceEvents,
  checkEarnedAutonomy,
} from "@/lib/omega/confidence-ledger";
import type { CanonicalGuardianDecision } from "@/lib/omega/nodes/guardian";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as Parameters<typeof withCompatTelemetry>[0]["req"],
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.health.get",
    handler: async () => {
      const userId = gate.canon.clerkUserId;

      // Get all health data in parallel
      const [
        recentEvents,
        calibrationData,
        autonomyInfo,
        earnedAutonomy,
        levelDescriptions,
      ] = await Promise.all([
        getRecentConfidenceEvents(userId, 10),
        getCalibrationData(userId),
        getUserAutonomyLevel(userId),
        checkEarnedAutonomy(userId),
        getAutonomyLevelDescriptions(),
      ]);

      // Dry-run Guardian decision for a sample action (no execution)
      const sampleDecision = await checkConstraintsWithEscalation(userId, {
        type: "sample_action",
        domain: "general",
        confidence: 0.75,
        isIrreversible: false,
      });

      // Compute canonical guardian decision from sample
      const canonicalSampleDecision: CanonicalGuardianDecision = {
        allowed: sampleDecision.canProceed,
        required_action: !sampleDecision.canProceed
          ? "block"
          : sampleDecision.requiresConfirmation
            ? "queue_review"
            : "execute",
        autonomy_level_used: sampleDecision.userAutonomyLevel as 0 | 1 | 2 | 3,
        explanation: sampleDecision.canProceed
          ? sampleDecision.requiresConfirmation
            ? `Requires confirmation: ${sampleDecision.confirmationNeeded.join(", ")}`
            : "Action allowed"
          : `Blocked by: ${sampleDecision.blockedBy.join(", ")}`,
        constraint_hits: [
          ...sampleDecision.blockedBy.map(c => ({ constraint: c, passed: false, reason: "Blocked" })),
          ...sampleDecision.confirmationNeeded.map(c => ({ constraint: c, passed: true, reason: "Needs confirmation" })),
          ...sampleDecision.observing.map(c => ({ constraint: c, passed: true, reason: "Observing" })),
        ],
      };

      const levelName = levelDescriptions.find(l => l.level === autonomyInfo.level)?.name || "Unknown";

      return Response.json({
        ok: true,
        timestamp: new Date().toISOString(),
        userId,

        // Confidence events
        confidenceEvents: {
          recent: recentEvents,
          count: recentEvents.length,
        },

        // Calibration summary
        calibration: {
          buckets: calibrationData,
          bucketCount: calibrationData.length,
          hasData: calibrationData.length > 0,
          overallGap: calibrationData.length > 0
            ? calibrationData.reduce((sum, b) => sum + b.calibrationGap * b.totalPredictions, 0) /
              calibrationData.reduce((sum, b) => sum + b.totalPredictions, 0)
            : null,
        },

        // Autonomy status
        autonomy: {
          currentLevel: autonomyInfo.level,
          levelName,
          reason: autonomyInfo.reason,
          isManualOverride: autonomyInfo.isManualOverride,
          earned: {
            level: earnedAutonomy.level,
            reason: earnedAutonomy.reason,
            calibrationScore: earnedAutonomy.calibrationScore,
          },
        },

        // Guardian sample decision (dry-run)
        guardianSampleDecision: {
          dryRun: true,
          sampleAction: {
            type: "sample_action",
            domain: "general",
            confidence: 0.75,
            isIrreversible: false,
          },
          decision: sampleDecision,
          canonicalDecision: canonicalSampleDecision,
        },
      });
    },
  });
}
