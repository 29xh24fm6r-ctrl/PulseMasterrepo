// Autonomous Decision Partner API
// app/api/decision-partner/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import { analyzeDecision } from "@/lib/cortex/sovereign/decision-partner/analyzer";
import { DecisionScenario } from "@/lib/cortex/sovereign/decision-partner/types";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const scenario: DecisionScenario = {
      id: body.id || `decision_${Date.now()}`,
      userId,
      createdAt: body.createdAt || new Date().toISOString(),
      title: body.title,
      description: body.description,
      options: body.options,
      status: "analyzing",
    };

    const ctx = await buildPulseCortexContext(userId);
    const analysis = await analyzeDecision(userId, scenario, ctx);

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    console.error("[Decision Partner] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to analyze decision";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



