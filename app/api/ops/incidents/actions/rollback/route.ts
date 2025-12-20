// src/app/api/ops/incidents/actions/rollback/route.ts
import { NextResponse } from "next/server";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";
import { dispatchWorkflow } from "@/lib/ops/github/dispatchWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dispatches the auto-rollback-pr workflow manually.
 *
 * Requires:
 * - WAR_ROOM_ADMIN_TOKEN (header x-war-room-token)
 * - GITHUB_OWNER, GITHUB_REPO, GITHUB_AUTO_ROLLBACK_WORKFLOW_FILE
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
    const workflowFile = process.env.GITHUB_AUTO_ROLLBACK_WORKFLOW_FILE || ""; // e.g. "auto-rollback-pr.yml"

    if (!owner || !repo || !workflowFile) {
      return NextResponse.json(
        { ok: false, error: "missing_env:GITHUB_OWNER/GITHUB_REPO/GITHUB_AUTO_ROLLBACK_WORKFLOW_FILE" },
        { status: 500 }
      );
    }

    // Optional inputs: allow operator to pass a note
    const body = await req.json().catch(() => ({}));
    const note = String(body?.note || "").slice(0, 200);

    await dispatchWorkflow({
      owner,
      repo,
      workflowFile,
      ref: "main",
      inputs: note ? { operator_note: note } : {},
    });

    await writeOpsEvent({
      source: "app",
      event_type: "operator_dispatched_auto_rollback",
      level: "warn",
      summary: "Operator dispatched auto-rollback workflow",
      link: null,
      payload: { owner, repo, workflowFile, note },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}

