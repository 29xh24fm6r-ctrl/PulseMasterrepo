// src/app/api/ops/incidents/actions/smoke/route.ts
import { NextResponse } from "next/server";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";
import { dispatchWorkflow } from "@/lib/ops/github/dispatchWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dispatches prod smoke.
 * Supports optional rollback_head_ref (to test rollback branches).
 *
 * Requires:
 * - WAR_ROOM_ADMIN_TOKEN (header x-war-room-token)
 * - GITHUB_OWNER, GITHUB_REPO, GITHUB_PROD_SMOKE_WORKFLOW_FILE
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-war-room-token") || "";
    const expected = process.env.WAR_ROOM_ADMIN_TOKEN || "";

    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const owner = process.env.GITHUB_OWNER || "";
    const repo = process.env.GITHUB_REPO || "";
    const workflowFile = process.env.GITHUB_PROD_SMOKE_WORKFLOW_FILE || ""; // e.g. "sentinel-rollback.yml"

    if (!owner || !repo || !workflowFile) {
      return NextResponse.json(
        { ok: false, error: "missing_env:GITHUB_OWNER/GITHUB_REPO/GITHUB_PROD_SMOKE_WORKFLOW_FILE" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rollbackHeadRef = body?.rollback_head_ref ? String(body.rollback_head_ref) : "";
    const target = rollbackHeadRef || "main";

    await dispatchWorkflow({
      owner,
      repo,
      workflowFile,
      ref: "main",
      inputs: rollbackHeadRef ? { rollback_head_ref: rollbackHeadRef } : {},
    });

    await writeOpsEvent({
      source: "app",
      event_type: "operator_dispatched_smoke",
      level: "info",
      summary: `Operator dispatched prod smoke (${target})`,
      payload: { owner, repo, workflowFile, rollback_head_ref: rollbackHeadRef || null },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}

