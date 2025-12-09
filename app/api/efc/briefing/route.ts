// API Route: GET /api/efc/briefing
// Get daily executive briefing

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { EFC } from "@/lib/efc";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const briefing = await EFC.getDailyBriefing(userId);

    return NextResponse.json({
      success: true,
      briefing: {
        energy: {
          level: briefing.energy_state.current_level,
          trend: briefing.energy_state.trend,
          optimal_for: briefing.energy_state.optimal_task_types,
        },
        priorities: briefing.top_priorities.slice(0, 5).map(p => ({
          id: p.id,
          title: p.title,
          reasoning: p.reasoning,
          urgency: p.urgency,
          importance: p.importance,
          estimated_minutes: p.estimated_minutes,
          priority_score: p.priority_score,
        })),
        sequence: {
          title: briefing.recommended_sequence.title,
          total_minutes: briefing.recommended_sequence.total_minutes,
          action_count: briefing.recommended_sequence.actions.length,
          actions: briefing.recommended_sequence.actions.slice(0, 5).map(a => ({
            title: a.title,
            estimated_minutes: a.estimated_minutes,
            energy_required: a.energy_required,
          })),
        },
        commitments: briefing.active_commitments.slice(0, 5).map(c => ({
          id: c.id,
          title: c.title,
          made_to: c.made_to,
          due_at: c.due_at,
          progress: c.progress,
        })),
        nudges: briefing.pending_nudges.slice(0, 3).map(n => ({
          id: n.id,
          type: n.nudge_type,
          message: n.message,
          urgency: n.urgency,
        })),
        follow_through_score: briefing.follow_through_score,
      },
    });
  } catch (error: any) {
    console.error("[EFC Briefing] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const maxDuration = 30;