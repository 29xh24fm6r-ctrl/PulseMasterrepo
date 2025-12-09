// API Route: /api/efc/actions
// Generate and manage recommended actions

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ActionGenerator } from "@/lib/efc/action-generator";
import { PriorityEngine } from "@/lib/efc/priority-engine";
import { EnergyMatcher } from "@/lib/efc/energy-matcher";

// GET /api/efc/actions - Get suggested actions
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const urgency = searchParams.get("urgency") as any;

    // Get current energy state
    const energyState = await EnergyMatcher.getCurrentEnergyState(userId);

    // Get prioritized actions
    const actions = await PriorityEngine.getTopPriorities(userId, {
      limit,
      energy_state: energyState || undefined,
    });

    // Filter by urgency if specified
    const filtered = urgency
      ? actions.filter(a => a.urgency === urgency)
      : actions;

    return NextResponse.json({
      actions: filtered,
      energy_state: energyState,
      count: filtered.length,
    });
  } catch (error: any) {
    console.error("[EFC Actions GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/efc/actions - Generate new actions
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      context_query,
      entity_ids,
      include_calendar = true,
      include_tasks = true,
      max_actions = 6,
      time_horizon = "today",
    } = body;

    // Generate actions
    const actions = await ActionGenerator.generateActions(userId, {
      context_query,
      entity_ids,
      include_calendar,
      include_tasks,
      max_actions,
      time_horizon,
    });

    // Store them
    const ids = await ActionGenerator.storeGeneratedActions(userId, actions);

    // Get prioritized version
    const energyState = await EnergyMatcher.getCurrentEnergyState(userId);
    const prioritized = PriorityEngine.prioritizeActions({
      actions,
      energy_state: energyState || undefined,
    });

    return NextResponse.json({
      success: true,
      actions: prioritized,
      ids,
      count: prioritized.length,
    });
  } catch (error: any) {
    console.error("[EFC Actions POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/efc/actions - Update action status
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action_id, status } = body;

    if (!action_id || !status) {
      return NextResponse.json(
        { error: "action_id and status required" },
        { status: 400 }
      );
    }

    await ActionGenerator.updateActionStatus(userId, action_id, status);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[EFC Actions PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}