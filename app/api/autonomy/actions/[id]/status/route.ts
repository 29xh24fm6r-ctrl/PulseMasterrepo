/**
 * Autonomy Actions API
 * GET /api/autonomy/actions - List actions
 * POST /api/autonomy/actions - Create action (internal use)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import {
  getSuggestedActions,
  getActionsByStatus,
  createAutonomyAction,
  AutonomyActionStatus,
  AutonomyActionType,
} from "@/lib/autonomy/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "suggested") as AutonomyActionStatus;
    const limit = parseInt(searchParams.get("limit") || "10");

    let actions;
    if (status === "suggested") {
      actions = await getSuggestedActions(userId, limit);
    } else {
      actions = await getActionsByStatus(userId, status, limit);
    }

    return NextResponse.json({
      actions,
      count: actions.length,
    });
  } catch (error: any) {
    console.error("[Autonomy Actions GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, title, description, relatedInsightId, scheduledFor } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: "type and title are required" },
        { status: 400 }
      );
    }

    const validTypes: AutonomyActionType[] = [
      "task",
      "follow_up",
      "habit_nudge",
      "reflection",
      "briefing",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const actionId = await createAutonomyAction({
      userId,
      type,
      title,
      description,
      relatedInsightId,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });

    if (!actionId) {
      return NextResponse.json(
        { error: "Failed to create action" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: actionId });
  } catch (error: any) {
    console.error("[Autonomy Actions POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}