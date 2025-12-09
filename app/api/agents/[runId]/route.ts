cat > 'app/api/agents/[runId]/route.ts' << 'EOF'
/**
 * Agent Run API
 * app/api/agents/[runId]/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  runAgent,
  getRun,
  getRunMessages,
  completeRun,
  abortRun,
} from "@/lib/agents";

/**
 * GET /api/agents/[runId]
 * Get run details and messages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await params;

    const run = await getRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.user_id !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const messages = await getRunMessages(runId);

    return NextResponse.json({
      run,
      messages,
    });
  } catch (error: any) {
    console.error("[Agent Run API] GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch run" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/[runId]
 * Send a message to an existing run
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await params;
    const body = await req.json();
    const { message, payload } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Missing required field: message" },
        { status: 400 }
      );
    }

    const run = await getRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.user_id !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (run.status !== "active") {
      return NextResponse.json(
        { error: "Run is not active" },
        { status: 400 }
      );
    }

    const result = await runAgent({
      userId,
      agentKey: run.agent_key,
      message,
      payload,
      runId,
      caller: "ui",
    });

    return NextResponse.json({
      run_id: result.runId,
      response: result.response,
      messages: result.messages,
    });
  } catch (error: any) {
    console.error("[Agent Run API] POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/[runId]
 * Update run status (complete or abort)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await params;
    const body = await req.json();
    const { action } = body;

    const run = await getRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.user_id !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let success = false;
    if (action === "complete") {
      success = await completeRun(runId);
    } else if (action === "abort") {
      success = await abortRun(runId);
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'complete' or 'abort'" },
        { status: 400 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update run" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
    });
  } catch (error: any) {
    console.error("[Agent Run API] PATCH Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update run" },
      { status: 500 }
    );
  }
}
EOF