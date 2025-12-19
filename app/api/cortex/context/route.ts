// Cortex Context API
// app/api/cortex/context/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { evaluateAutonomy, getDomainActions } from "@/lib/cortex/autonomy";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") as "work" | "relationships" | "finance" | "life" | "strategy" | null;
    const includeActions = searchParams.get("actions") !== "false"; // Default true

    // Build context
    const context = await getWorkCortexContextForUser(userId);

    // Evaluate autonomy if requested
    let actions = null;
    if (includeActions) {
      if (domain) {
        actions = getDomainActions(context, domain);
      } else {
        actions = evaluateAutonomy(context);
      }
    }

    return NextResponse.json({
      context,
      actions: actions || undefined,
    });
  } catch (err: unknown) {
    console.error("[Cortex] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to build context";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



