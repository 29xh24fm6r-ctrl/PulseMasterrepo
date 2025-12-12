// Trigger Intervention API
// app/api/interventions/trigger/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { chooseIntervention, logInterventionExecution } from "@/lib/interventions/engine";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { emotion, risk_type, risk_score, coachId, patternType, patternKey } = body;

    const intervention = await chooseIntervention({
      userId,
      coachId,
      emotion: emotion || null,
      riskType: risk_type || null,
      riskScore: risk_score || null,
      patternType: patternType || null,
      patternKey: patternKey || null,
    });

    if (!intervention) {
      return NextResponse.json(
        { error: "No intervention found for this context" },
        { status: 404 }
      );
    }

    // Log execution start
    const executionId = await logInterventionExecution({
      userId,
      interventionKey: intervention.intervention.key,
      coachId: coachId || intervention.intervention.coach_id || undefined,
      triggerSource: "manual",
      riskType: risk_type || null,
      emotion: emotion || null,
      accepted: null,
      completed: false,
    });

    // Generate script skeleton
    const script = generateInterventionScript(intervention.intervention);

    return NextResponse.json({
      intervention: {
        key: intervention.intervention.key,
        label: intervention.intervention.label,
        description: intervention.intervention.description,
        estimatedDurationSeconds: intervention.intervention.min_duration_seconds,
      },
      reason: intervention.reason,
      executionId,
      script,
    });
  } catch (err: any) {
    console.error("[InterventionTrigger] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to trigger intervention" },
      { status: 500 }
    );
  }
}

function generateInterventionScript(intervention: any): string {
  switch (intervention.key) {
    case "grounding_breath":
      return `Take a deep breath in through your nose for 4 counts. Hold for 4 counts. Exhale slowly through your mouth for 6 counts. Repeat 3-5 times.`;
    case "warrior_activation":
      return `Stand tall. Take 3 powerful breaths. Remind yourself: "I do hard things." Visualize overcoming this challenge.`;
    case "focus_reset":
      return `Close your eyes for 10 seconds. Take 3 deep breaths. Open your eyes and name one clear next action.`;
    case "gratitude_moment":
      return `Pause. Name 3 things you're grateful for right now. Feel the shift in perspective.`;
    case "energy_boost":
      return `Stand up. Stretch your arms high. Take 3 quick, energizing breaths. Shake out your body.`;
    default:
      return `Follow the guidance for ${intervention.label}.`;
  }
}

