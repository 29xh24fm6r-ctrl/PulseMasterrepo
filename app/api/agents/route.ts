// app/api/agents/route.ts
import { NextResponse } from "next/server";
import { AgentRunInputSchema, listAgents, runAgent } from "@/lib/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agents
 * Returns available agents.
 */
export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      agents: listAgents(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "AGENTS_LIST_FAILED", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Body: { agent_id, input, context? }
 * Runs an agent and returns output.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = AgentRunInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await runAgent(parsed.data);
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "AGENT_RUN_FAILED", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
