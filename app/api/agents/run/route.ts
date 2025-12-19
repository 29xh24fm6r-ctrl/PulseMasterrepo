// app/api/agents/run/route.ts
// Sprint 4: Run an agent
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { runAgent } from "@/lib/agents/registry";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "agent_run" });

export const dynamic = "force-dynamic";

/**
 * POST /api/agents/run
 * 
 * Runs an agent for the authenticated user.
 * 
 * Body: { agent_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await req.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
    }

    const result = await runAgent(agent_id, supabaseUserId);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err: any) {
    logger.error("Agent run failed", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Agent run failed" },
      { status: 500 }
    );
  }
}

