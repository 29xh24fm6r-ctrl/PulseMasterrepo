// app/api/simulation/fixplans/[planId]/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { getFixPlan } from "@/lib/simulation/server/fixPlanStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/simulation/fixplans/:planId
 * Returns full markdown + patch_json.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ planId: string }> | { planId: string } }
) {
  try {
    const userId = await requireClerkUserId();
    const resolvedParams = params instanceof Promise ? await params : params;
    const planId = resolvedParams.planId;

    if (!planId) return NextResponse.json({ ok: false, error: "Missing planId" }, { status: 400 });

    const plan = await getFixPlan({ userId, planId });
    if (!plan) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, plan }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed" }, { status: 500 });
  }
}

