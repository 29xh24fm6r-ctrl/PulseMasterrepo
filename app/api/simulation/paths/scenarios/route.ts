// app/api/simulation/paths/scenarios/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { listSimulationScenarios } from "@/lib/simulation/server/runSimulationPaths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns registered scenarios from server-side registry.
 * Keeps UI fully client-safe.
 */
export async function GET(_req: Request) {
  try {
    await requireClerkUserId();

    const scenarios = await listSimulationScenarios();

    return NextResponse.json({ ok: true, scenarios }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || "Failed to load scenarios";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
