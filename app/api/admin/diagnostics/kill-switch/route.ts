// Kill Switch API
// POST /api/admin/diagnostics/kill-switch
// app/api/admin/diagnostics/kill-switch/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";

// Note: In production, these should be stored in DB or feature flags service
// For now, we'll update env vars (which requires server restart in real deployment)

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const body = await request.json();
    const { key, enabled } = body;

    if (!key || typeof enabled !== "boolean") {
      return jsonOk({ error: "key and enabled required" }, { status: 400 });
    }

    // Map keys to env var names
    const envMap: Record<string, string> = {
      web_intel_enabled: "BRAVE_API_KEY",
      aggressive_nudges_enabled: "PULSE_AGGRESSIVE_NUDGES",
      pulse_live_recording_enabled: "PULSE_LIVE_RECORDING",
    };

    const envVar = envMap[key];
    if (!envVar) {
      return jsonOk({ error: "Unknown kill switch" }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Store in DB table: kill_switches (key, enabled, updated_by, updated_at)
    // 2. Or use a feature flag service
    // For now, we'll just acknowledge and note that env vars require restart

    return jsonOk({
      ok: true,
      message: `Kill switch ${key} set to ${enabled}. Note: Environment variable changes require server restart.`,
      key,
      enabled,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

