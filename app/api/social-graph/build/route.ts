// Social Graph Mapping API
// app/api/social-graph/build/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import { buildSocialGraph } from "@/lib/relationships/social-graph/graph-builder";
import { detectOpportunities } from "@/lib/relationships/social-graph/opportunity-detector";
import { detectRisks } from "@/lib/relationships/social-graph/risk-detector";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await buildPulseCortexContext(userId);
    const graph = await buildSocialGraph(userId, ctx);
    const opportunities = detectOpportunities(graph);
    const risks = detectRisks(graph);

    return NextResponse.json({
      graph,
      opportunities,
      risks,
    });
  } catch (err: unknown) {
    console.error("[Social Graph] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to build social graph";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



