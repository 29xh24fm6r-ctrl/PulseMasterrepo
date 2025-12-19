// Cortex Actions API
// app/api/cortex/actions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import {
  evaluateAutonomy,
  getDomainActions,
  getHighRiskActions,
  applySafetyGuards,
} from "@/lib/cortex/autonomy";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") as "work" | "relationships" | "finance" | "life" | "strategy" | null;
    const highRiskOnly = searchParams.get("highRisk") === "true";

    // Build context
    const context = await getWorkCortexContextForUser(userId);

    // Get actions
    let actions;
    if (highRiskOnly) {
      actions = getHighRiskActions(context);
    } else if (domain) {
      actions = getDomainActions(context, domain);
    } else {
      actions = evaluateAutonomy(context);
    }

    // Safety guardrails are already applied in evaluateAutonomy,
    // but apply again for domain-specific calls
    if (domain || highRiskOnly) {
      actions = applySafetyGuards(actions, context);
    }

    return NextResponse.json({ actions });
  } catch (err: unknown) {
    console.error("[Cortex Actions] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to get actions";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

