// app/api/simulation/runs/[runId]/fixplans/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClerkUserId } from "@/lib/auth/requireUser";

import { generateFixPlan } from "@/lib/simulation/server/fixPlan";
import { insertFixPlanStub, updateFixPlan, getFixPlansForRun } from "@/lib/simulation/server/fixPlanStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/simulation/runs/:runId/fixplans
 * Lists fix plans for a run (metadata).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> | { runId: string } }
) {
  try {
    const clerkUserId = await requireClerkUserId();
    const resolvedParams = params instanceof Promise ? await params : params;
    const runId = resolvedParams.runId;

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 10)));

    const rows = await getFixPlansForRun({ userId: clerkUserId, runId, limit });
    return NextResponse.json({ ok: true, fixplans: rows }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed" }, { status: 500 });
  }
}

/**
 * POST /api/simulation/runs/:runId/fixplans
 * Body: { stepId: string, stepTitle?: string, step?: any }
 *
 * Generates a fix plan for a specific failed step (best-effort).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> | { runId: string } }
) {
  try {
    const clerkUserId = await requireClerkUserId();

    const resolvedParams = params instanceof Promise ? await params : params;
    const runId = resolvedParams.runId;

    const body = (await req.json().catch(() => ({}))) as {
      stepId?: string;
      stepTitle?: string;
      step?: any;
    };

    const stepId = (body.stepId || "").trim();
    if (!stepId) {
      return NextResponse.json({ ok: false, error: "stepId is required" }, { status: 400 });
    }

    // Resolve to database user ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();

    const dbUserId = userRow?.id || clerkUserId;

    const { data: run, error } = await supabaseAdmin
      .from("simulation_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", dbUserId)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!run) return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });

    // Step payload comes from client drilldown selection (already normalized there)
    const step = body.step ?? { id: stepId, title: body.stepTitle || stepId, ok: false };

    // Generate request id + create DB stub
    const gen = await generateFixPlan({
      userId: clerkUserId,
      run,
      step: {
        id: step.id,
        title: step.title || body.stepTitle || stepId,
        ok: false,
        severity: step.severity ?? "error",
        detail: step.detail ?? null,
        pathId: step.pathId ?? null,
        data: step.data ?? step,
      },
    });

    const planId = await insertFixPlanStub({
      userId: clerkUserId,
      runId,
      requestId: gen.request_id,
      stepId,
      stepTitle: step.title || body.stepTitle || null,
    });

    // Update with generated plan
    try {
      await updateFixPlan({
        id: planId,
        status: "generated",
        plan_markdown: gen.plan_markdown,
        patch_json: gen.patch_json,
        error: null,
      });

      return NextResponse.json(
        { ok: true, planId, request_id: gen.request_id, plan_markdown: gen.plan_markdown, patch_json: gen.patch_json },
        { status: 200 }
      );
    } catch (e: any) {
      await updateFixPlan({
        id: planId,
        status: "error",
        error: e?.message || "Failed to persist fix plan",
      });
      return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed" }, { status: 500 });
  }
}

