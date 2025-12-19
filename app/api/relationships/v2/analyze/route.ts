// Relationship Analysis API v2
// app/api/relationships/v2/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildRelationshipState } from "@/lib/domains/relationships/v2/relationship-state";
import { computeRelationshipScores, detectRelationshipRisks, detectOpportunities } from "@/lib/domains/relationships/v2/relationship-analyzer";
import { buildRelationshipPlan } from "@/lib/domains/relationships/v2/relationship-plan-builder";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId");

    if (!personId) {
      return NextResponse.json(
        { error: "Missing personId parameter" },
        { status: 400 }
      );
    }

    // Build relationship state
    const state = await buildRelationshipState(userId, personId);
    if (!state) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    // Analyze
    const scores = computeRelationshipScores(state);
    const risks = detectRelationshipRisks(state);
    const opportunities = detectOpportunities(state);

    // Build context for plan generation
    const ctx = await getWorkCortexContextForUser(userId);

    // Generate plans for different goals
    const reconnectPlan = buildRelationshipPlan(state, ctx, "reconnect");
    const repairPlan = state.emotionalAssociation === "negative"
      ? buildRelationshipPlan(state, ctx, "repair")
      : null;
    const strengthenPlan = state.importanceScore > 70
      ? buildRelationshipPlan(state, ctx, "strengthen")
      : null;

    return NextResponse.json({
      state,
      scores,
      risks,
      opportunities,
      plans: {
        reconnect: reconnectPlan,
        repair: repairPlan,
        strengthen: strengthenPlan,
      },
    });
  } catch (err: unknown) {
    console.error("[Relationship v2] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to analyze relationship";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



