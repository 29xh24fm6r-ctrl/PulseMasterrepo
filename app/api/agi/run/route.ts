// AGI Run API - Execute AGI kernel for current user
// app/api/agi/run/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runAGIKernel } from "@/lib/agi/kernel";
import { logAGIRunToDB, logAGIActionsToDB } from "@/lib/agi/persistence";
import { executeActions } from "@/lib/agi/executor";
import { supabaseAdmin } from "@/lib/supabase";

async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  const { userId } = await auth();
  return userId || null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const trigger = body.trigger ?? { type: "manual", source: "api/agi/run" };

    // Check AGI settings before running
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    const { data: settings } = await supabaseAdmin
      .from("user_agi_settings")
      .select("level")
      .eq("user_id", dbUserId)
      .maybeSingle();

    const agiLevel = settings?.level || "assist";

    if (agiLevel === "off") {
      return NextResponse.json(
        { error: "AGI is disabled for this user. Please enable it in settings." },
        { status: 403 }
      );
    }

    const run = await runAGIKernel(userId, trigger);
    const runId = await logAGIRunToDB(run);
    if (runId) {
      await logAGIActionsToDB(userId, runId, run.finalPlan);
    }

    // Check user AGI settings to decide execution
    const { data: settings } = await supabaseAdmin
      .from("user_agi_settings")
      .select("level, require_confirmation_for_high_impact")
      .eq("user_id", dbUserId)
      .maybeSingle();

    const agiLevel = settings?.level || "assist";

    // Execute actions based on level
    if (agiLevel === "autopilot") {
      // Only execute low-risk actions automatically
      const lowRiskActions = run.finalPlan.filter(
        (a) => a.riskLevel === "low" && !a.requiresConfirmation
      );
      await executeActions(userId, lowRiskActions);
    }
    // For "assist" level, actions remain in "planned" status for user review

    return NextResponse.json(run);
  } catch (err: any) {
    console.error("AGI run error:", err);
    return NextResponse.json({ error: err.message || "Failed to run AGI kernel" }, { status: 500 });
  }
}

