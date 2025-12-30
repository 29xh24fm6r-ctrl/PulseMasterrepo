// app/api/agents/[runId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { abortRun, completeRun, getRun, getRunMessages } from "@/lib/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Define strict types for Next.js 15 App Router dynamic routes
type Props = {
  params: Promise<{ runId: string }>;
};

/**
 * GET /api/agents/:runId
 * Returns run record + messages.
 */
export async function GET(
  _req: NextRequest,
  props: Props
) {
  try {
    const params = await props.params;
    const runId = params.runId;

    if (!runId) {
      return NextResponse.json({ ok: false, error: "MISSING_RUN_ID" }, { status: 400 });
    }

    const run = await getRun(runId);
    if (!run) {
      return NextResponse.json({ ok: false, error: "RUN_NOT_FOUND" }, { status: 404 });
    }

    const messages = await getRunMessages(runId);

    return NextResponse.json({ ok: true, run, messages });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "RUN_READ_FAILED", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/:runId
 * Body: { action: "complete" | "abort", output?: string, reason?: string }
 */
export async function POST(
  req: NextRequest,
  props: Props
) {
  try {
    const params = await props.params;
    const runId = params.runId;

    if (!runId) {
      return NextResponse.json({ ok: false, error: "MISSING_RUN_ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const action = body?.action;

    if (action === "complete") {
      const output = typeof body?.output === "string" ? body.output : "";
      const updated = await completeRun(runId, output);
      if (!updated) return NextResponse.json({ ok: false, error: "RUN_NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok: true, run: updated });
    }

    if (action === "abort") {
      const reason = typeof body?.reason === "string" ? body.reason : undefined;
      const updated = await abortRun(runId, reason);
      if (!updated) return NextResponse.json({ ok: false, error: "RUN_NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok: true, run: updated });
    }

    return NextResponse.json(
      { ok: false, error: "INVALID_ACTION", expected: ["complete", "abort"] },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "RUN_UPDATE_FAILED", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/:runId
 * Update run status (complete or abort)
 * Kept for backward compatibility if needed, but POST handles actions now.
 */
export async function PATCH(
  req: NextRequest,
  props: Props
) {
  // Delegate to POST logic for simplicity in this patch
  return POST(req, props);
}