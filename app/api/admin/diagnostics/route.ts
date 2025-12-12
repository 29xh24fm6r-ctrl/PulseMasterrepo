// Diagnostics API
// GET /api/admin/diagnostics
// app/api/admin/diagnostics/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    // Get recent Pulse Live sessions
    const { data: sessions } = await supabase
      .from("call_sessions")
      .select("id, started_at, ended_at, status")
      .eq("owner_user_id", userId)
      .order("started_at", { ascending: false })
      .limit(10);

    const recentSessions = (sessions || []).map((s) => ({
      id: s.id,
      started_at: s.started_at,
      duration: s.ended_at
        ? Math.floor(
            (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000
          )
        : 0,
      status: s.status,
    }));

    // Get kill switches (from env or DB)
    const killSwitches = {
      web_intel_enabled: process.env.BRAVE_API_KEY ? true : false,
      aggressive_nudges_enabled: process.env.PULSE_AGGRESSIVE_NUDGES === "true",
      pulse_live_recording_enabled: process.env.PULSE_LIVE_RECORDING !== "false",
    };

    // Latest errors (stub - would come from error logging service)
    const latestErrors: any[] = [];

    // Slow endpoints (stub - would come from monitoring)
    const slowEndpoints: any[] = [];

    return jsonOk({
      latestErrors,
      slowEndpoints,
      recentSessions,
      killSwitches,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

