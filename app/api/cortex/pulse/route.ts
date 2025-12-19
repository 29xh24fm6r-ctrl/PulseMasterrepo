// Cortex Pulse Loop - Autonomous Decision Engine
// app/api/cortex/pulse/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { runAutonomy } from "@/lib/cortex/autonomy/v3";
import { logTrace } from "@/lib/cortex/trace/trace";

/**
 * Cortex Pulse Loop
 * Runs every 5-10 minutes to:
 * - Build Cortex Context
 * - Run Autonomy
 * - Write Trace
 * - Store decisions
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();

    // 1. Build Cortex Context
    await logTrace(userId, "cortex", "info", "Building Cortex Context", {}, {
      domain: "global",
    });

    const context = await getWorkCortexContextForUser(userId);

    await logTrace(
      userId,
      "cortex",
      "info",
      "Cortex Context built",
      {
        domains: Object.keys(context.domains),
        chapterCount: context.longitudinal.chapters.length,
        patternCount: context.longitudinal.aggregatedPatterns.length,
      },
      { domain: "global" }
    );

    // 2. Run Autonomy
    await logTrace(userId, "autonomy", "info", "Running Autonomy Engine", {}, {
      domain: "global",
    });

    const actions = runAutonomy(context);

    await logTrace(
      userId,
      "autonomy",
      "info",
      `Autonomy generated ${actions.length} actions`,
      {
        actionCount: actions.length,
        byDomain: actions.reduce((acc, a) => {
          acc[a.domain] = (acc[a.domain] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      { domain: "global" }
    );

    // 3. Log each action
    for (const action of actions) {
      await logTrace(
        userId,
        "autonomy",
        action.severity === "urgent" ? "warn" : "info",
        `Action: ${action.title}`,
        {
          domain: action.domain,
          severity: action.severity,
          requiresConfirmation: action.requiresConfirmation,
        },
        {
          domain: action.domain,
          actionId: action.id,
        }
      );
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      context: {
        timestamp: context.timestamp,
        domains: Object.keys(context.domains),
        chapterCount: context.longitudinal.chapters.length,
        patternCount: context.longitudinal.aggregatedPatterns.length,
      },
      actions: {
        count: actions.length,
        byDomain: actions.reduce((acc, a) => {
          acc[a.domain] = (acc[a.domain] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        highSeverity: actions.filter((a) => a.severity === "urgent").length,
      },
      performance: {
        durationMs: duration,
      },
    });
  } catch (err: unknown) {
    console.error("[Cortex Pulse] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to run pulse";
    
    // Log error to trace
    try {
      const { userId } = await auth();
      if (userId) {
        await logTrace(
          userId,
          "cortex",
          "error",
          `Pulse loop failed: ${errorMessage}`,
          { error: errorMessage },
          { domain: "global" }
        );
      }
    } catch {}

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

