// app/api/automation/scan/route.ts
// Sprint 4: Trigger autopilot scan
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { runAutopilotScan } from "@/lib/automation/engine";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "automation_scan" });

export const dynamic = "force-dynamic";

/**
 * POST /api/automation/scan
 * 
 * Triggers an autopilot scan for the authenticated user.
 * 
 * Body: { policy_id?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await req.json().catch(() => ({}));
    const { policy_id } = body;

    const result = await runAutopilotScan(supabaseUserId, policy_id);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err: any) {
    logger.error("Autopilot scan failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Autopilot scan failed" },
      { status: 500 }
    );
  }
}

