// Life Arc Autopilot - Main Entry Point
// lib/life-arc/autopilot/index.ts

import { supabaseAdmin } from "@/lib/supabase";
import { runWeeklyLifeArcAutopilot } from "./weekly";
import { runDailyLifeArcAutopilot } from "./daily";
import { detectLifeArcRisks } from "./risk";
import { syncQuestsToAutopilot } from "./sync";

export interface LogAutopilotRunParams {
  userId: string;
  runType: "daily" | "weekly";
  status: "success" | "error";
  details: Record<string, any>;
  runDate?: string;
}

/**
 * Log autopilot run
 */
async function logAutopilotRun(params: LogAutopilotRunParams): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", params.userId)
    .single();

  const dbUserId = userRow?.id || params.userId;

  const runDate = params.runDate || new Date().toISOString().split("T")[0];

  await supabaseAdmin.from("life_arc_autopilot_runs").insert({
    user_id: dbUserId,
    run_type: params.runType,
    run_date: runDate,
    status: params.status,
    details: params.details,
  });
}

/**
 * Run weekly life arc autopilot for user
 */
export async function runWeeklyLifeArcAutopilotForUser(
  userId: string,
  weekStartDate?: string
): Promise<void> {
  try {
    const result = await runWeeklyLifeArcAutopilot(userId, weekStartDate);
    await logAutopilotRun({
      userId,
      runType: "weekly",
      status: "success",
      details: { objectives: result.objectives },
      runDate: weekStartDate,
    });
  } catch (err: any) {
    await logAutopilotRun({
      userId,
      runType: "weekly",
      status: "error",
      details: { error: String(err) },
      runDate: weekStartDate,
    });
    throw err;
  }
}

/**
 * Run daily life arc autopilot for user
 */
export async function runDailyLifeArcAutopilotForUser(
  userId: string,
  date?: string
): Promise<void> {
  try {
    const result = await runDailyLifeArcAutopilot(userId, date);

    // Sync to Autopilot actions
    await syncQuestsToAutopilot({
      userId,
      focusItems: result.items,
    });

    // Detect risks
    const risks = await detectLifeArcRisks(userId);

    // Log run
    await logAutopilotRun({
      userId,
      runType: "daily",
      status: "success",
      details: {
        items: result.items,
        risks: risks.map((r) => ({
          arcId: r.arcId,
          riskType: r.riskType,
          severity: r.severity,
        })),
      },
      runDate: date,
    });

    // Optionally trigger notifications for high-severity risks
    const highSeverityRisks = risks.filter((r) => r.severity >= 3);
    if (highSeverityRisks.length > 0) {
      // Would trigger notification system here
      console.log(`[ArcAutopilot] High-severity risks detected:`, highSeverityRisks);
    }
  } catch (err: any) {
    await logAutopilotRun({
      userId,
      runType: "daily",
      status: "error",
      details: { error: String(err) },
      runDate: date,
    });
    throw err;
  }
}

/**
 * Run autopilot for all active users
 */
export async function runAutopilotForAllUsers(
  runType: "daily" | "weekly"
): Promise<void> {
  // Get all users with active life arcs
  const { data: usersWithArcs } = await supabaseAdmin
    .from("life_arcs")
    .select("user_id")
    .eq("status", "active")
    .not("user_id", "is", null);

  if (!usersWithArcs) return;

  const uniqueUserIds = Array.from(new Set(usersWithArcs.map((a) => a.user_id)));

  for (const userId of uniqueUserIds) {
    try {
      // Get clerk_id from user_id
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("clerk_id")
        .eq("id", userId)
        .maybeSingle();

      if (user?.clerk_id) {
        if (runType === "daily") {
          await runDailyLifeArcAutopilotForUser(user.clerk_id);
        } else {
          await runWeeklyLifeArcAutopilotForUser(user.clerk_id);
        }
      }
    } catch (err) {
      console.error(`[ArcAutopilot] Failed for user ${userId}:`, err);
      // Continue with other users
    }
  }
}




