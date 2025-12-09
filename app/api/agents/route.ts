/**
 * Agents API
 * app/api/agents/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listAgents, runAgent, getUserRuns } from "@/lib/agents";

/**
 * GET /api/agents
 * List available agents and optionally user's runs
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const includeRuns = url.searchParams.get("includeRuns") === "true";

    const agents = listAgents();

    let runs: any[] = [];
    if (includeRuns) {
      runs = await getUserRuns({ userId, status: "active", limit: 10 });
    }

    return NextResponse.json({
      agents,
      runs: includeRuns ? runs : undefined,
    });
  } catch (error: any) {
    console.error("[Agents API] GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Start a new agent run
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { agent_key, message, payload, topic } = body;

    if (!agent_key) {
      return NextResponse.json(
        { error: "Missing required field: agent_key" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Missing required field: message" },
        { status: 400 }
      );
    }

    const result = await runAgent({
      userId,
      agentKey: agent_key,
      message,
      payload,
      topic,
      caller: "ui",
    });

    return NextResponse.json({
      run_id: result.runId,
      response: result.response,
      messages: result.messages,
    });
  } catch (error: any) {
    console.error("[Agents API] POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run agent" },
      { status: 500 }
    );
  }
}
