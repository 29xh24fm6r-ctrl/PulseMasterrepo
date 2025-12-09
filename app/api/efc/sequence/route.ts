// API Route: /api/efc/sequence
// Generate and manage action sequences

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ActionSequencer } from "@/lib/efc/action-sequencer";
import { PriorityEngine } from "@/lib/efc/priority-engine";
import { EnergyMatcher } from "@/lib/efc/energy-matcher";
import { ActionGenerator } from "@/lib/efc/action-generator";

// GET /api/efc/sequence - Get active sequence
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sequence = await ActionSequencer.getActiveSequence(userId);

    if (!sequence) {
      return NextResponse.json({
        sequence: null,
        message: "No active sequence. Generate one with POST.",
      });
    }

    return NextResponse.json({ sequence });
  } catch (error: any) {
    console.error("[EFC Sequence GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/efc/sequence - Generate a new sequence
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      sequence_type = "daily",
      duration_minutes,
      focus_area,
      work_hours = 8,
    } = body;

    // Get energy state
    const energyState = await EnergyMatcher.getCurrentEnergyState(userId);
    const startEnergy = energyState?.current_level || "medium";

    // Get prioritized actions
    const actions = await PriorityEngine.getTopPriorities(userId, {
      energy_state: energyState || undefined,
      limit: 20,
    });

    if (actions.length === 0) {
      // Generate some actions first
      const generated = await ActionGenerator.generateActions(userId, {
        include_calendar: true,
        include_tasks: true,
        max_actions: 8,
      });
      await ActionGenerator.storeGeneratedActions(userId, generated);
      
      // Re-fetch
      const fresh = await PriorityEngine.getTopPriorities(userId, {
        energy_state: energyState || undefined,
        limit: 20,
      });
      actions.push(...fresh);
    }

    let sequence;

    if (sequence_type === "focus_block" && duration_minutes) {
      sequence = ActionSequencer.generateFocusBlockSequence(actions, {
        durationMinutes: duration_minutes,
        energy: startEnergy,
        focusArea: focus_area,
      });
    } else {
      sequence = ActionSequencer.generateDailySequence(actions, {
        startEnergy,
        workHours: work_hours,
        includeBreaks: true,
      });
    }

    // Store sequence
    sequence.user_id = userId;
    const id = await ActionSequencer.storeSequence(userId, sequence);
    sequence.id = id;

    return NextResponse.json({
      success: true,
      sequence: {
        id: sequence.id,
        type: sequence.sequence_type,
        title: sequence.title,
        total_minutes: sequence.total_minutes,
        action_count: sequence.actions.length,
        energy_flow: sequence.energy_flow,
        actions: sequence.actions.map(a => ({
          id: a.id,
          title: a.title,
          estimated_minutes: a.estimated_minutes,
          energy_required: a.energy_required,
          priority_score: a.priority_score,
        })),
      },
    });
  } catch (error: any) {
    console.error("[EFC Sequence POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}