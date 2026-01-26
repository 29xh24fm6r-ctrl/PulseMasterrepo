// app/api/omega/autonomy/route.ts
// Autonomy management API for Pulse Omega

export const runtime = "nodejs";

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import {
  getUserAutonomyLevel,
  setAutonomyOverride,
  clearAutonomyOverride,
  checkConstraintsWithEscalation,
  getAutonomyLevelDescriptions,
  getAutonomyHistory,
  type AutonomyLevel,
} from "@/lib/omega/autonomy";
import {
  getCalibrationData,
  getRecentConfidenceEvents,
  checkEarnedAutonomy,
} from "@/lib/omega/confidence-ledger";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as Parameters<typeof withCompatTelemetry>[0]["req"],
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.autonomy.get",
    handler: async () => {
      const url = new URL(req.url);
      const includeCalibration = url.searchParams.get("calibration") === "true";
      const includeHistory = url.searchParams.get("history") === "true";
      const includeRecentEvents = url.searchParams.get("events") === "true";

      // Get user's current autonomy level
      const autonomy = await getUserAutonomyLevel(gate.canon.clerkUserId);

      // Get earned autonomy calculation
      const earned = await checkEarnedAutonomy(gate.canon.clerkUserId);

      // Get level descriptions
      const levelDescriptions = await getAutonomyLevelDescriptions();

      const response: Record<string, unknown> = {
        ok: true,
        autonomy: {
          currentLevel: autonomy.level,
          levelName: levelDescriptions.find((l) => l.level === autonomy.level)?.name || "Unknown",
          reason: autonomy.reason,
          isManualOverride: autonomy.isManualOverride,
        },
        earned: {
          level: earned.level,
          reason: earned.reason,
          calibrationScore: earned.calibrationScore,
        },
        levelDescriptions,
      };

      // Optionally include calibration data
      if (includeCalibration) {
        response.calibration = await getCalibrationData(gate.canon.clerkUserId);
      }

      // Optionally include history
      if (includeHistory) {
        response.history = await getAutonomyHistory(gate.canon.clerkUserId);
      }

      // Optionally include recent confidence events
      if (includeRecentEvents) {
        response.recentEvents = await getRecentConfidenceEvents(gate.canon.clerkUserId, 20);
      }

      return Response.json(response);
    },
  });
}

export async function POST(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as Parameters<typeof withCompatTelemetry>[0]["req"],
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.autonomy.post",
    handler: async () => {
      const body = await req.json();
      const { action } = body;

      if (action === "override") {
        const { level, reason, expiresInHours } = body;

        if (typeof level !== "number" || level < 0 || level > 3) {
          return Response.json(
            { ok: false, error: "Invalid autonomy level. Must be 0-3." },
            { status: 400 }
          );
        }

        if (!reason || typeof reason !== "string") {
          return Response.json(
            { ok: false, error: "Reason is required for override." },
            { status: 400 }
          );
        }

        const success = await setAutonomyOverride(
          gate.canon.clerkUserId,
          level as AutonomyLevel,
          reason,
          expiresInHours
        );

        if (!success) {
          return Response.json(
            { ok: false, error: "Failed to set autonomy override" },
            { status: 500 }
          );
        }

        return Response.json({
          ok: true,
          message: `Autonomy level set to ${level}`,
          level,
          reason,
          expiresInHours: expiresInHours || null,
        });
      }

      if (action === "clear_override") {
        const success = await clearAutonomyOverride(gate.canon.clerkUserId);

        if (!success) {
          return Response.json(
            { ok: false, error: "Failed to clear autonomy override" },
            { status: 500 }
          );
        }

        // Return the new computed level
        const newAutonomy = await getUserAutonomyLevel(gate.canon.clerkUserId);

        return Response.json({
          ok: true,
          message: "Autonomy override cleared",
          newLevel: newAutonomy.level,
          reason: newAutonomy.reason,
        });
      }

      if (action === "check") {
        const { actionToCheck } = body;

        if (!actionToCheck || !actionToCheck.type) {
          return Response.json(
            { ok: false, error: "actionToCheck with type is required" },
            { status: 400 }
          );
        }

        const decision = await checkConstraintsWithEscalation(gate.canon.clerkUserId, {
          type: actionToCheck.type,
          domain: actionToCheck.domain,
          confidence: actionToCheck.confidence || 0.5,
          isIrreversible: actionToCheck.isIrreversible || false,
        });

        return Response.json({
          ok: true,
          decision,
        });
      }

      return Response.json(
        { ok: false, error: "Unknown action. Valid actions: override, clear_override, check" },
        { status: 400 }
      );
    },
  });
}
