// Life Arc Risk Detection
// lib/life-arc/autopilot/risk.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getLifeArcPlan } from "../planner";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";

export interface LifeArcRisk {
  arcId: string;
  riskType: "stagnation" | "regression" | "overload" | "conflict";
  severity: number; // 1–5
  description: string;
}

/**
 * Detect life arc risks
 */
export async function detectLifeArcRisks(userId: string): Promise<LifeArcRisk[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const plan = await getLifeArcPlan(userId);
  const risks: LifeArcRisk[] = [];

  // Get emotion state for overload detection
  let emotionState: any = null;
  try {
    emotionState = await getCurrentEmotionState(userId);
  } catch (err) {
    // Optional
  }

  for (const arc of plan.arcs) {
    // Check for stagnation
    const stagnationRisk = await detectStagnation(arc.id, dbUserId);
    if (stagnationRisk) {
      risks.push(stagnationRisk);
    }

    // Check for regression
    const regressionRisk = await detectRegression(arc.id, dbUserId);
    if (regressionRisk) {
      risks.push(regressionRisk);
    }
  }

  // Check for overload (too many arcs + high stress)
  if (plan.arcs.length >= 3 && emotionState && (emotionState.intensity || 0) > 0.7) {
    risks.push({
      arcId: plan.arcs[0].id, // Use first arc as representative
      riskType: "overload",
      severity: 4,
      description: `You have ${plan.arcs.length} active life arcs and high stress. Consider pausing one to reduce overwhelm.`,
    });
  }

  // Check for conflict (performance + healing both high priority)
  const performanceArc = plan.arcs.find((a) => a.key === "performance_push");
  const healingArc = plan.arcs.find((a) => a.key === "healing" || a.key === "emotional_stability");
  if (performanceArc && healingArc && performanceArc.priority <= 2 && healingArc.priority <= 2) {
    risks.push({
      arcId: performanceArc.id,
      riskType: "conflict",
      severity: 3,
      description: "Performance push and healing arcs are both high priority. Risk of burnout if not balanced.",
    });
  }

  // Save risks to database
  for (const risk of risks) {
    if (risk.severity >= 2) {
      await supabaseAdmin.from("life_arc_risk_events").insert({
        user_id: dbUserId,
        arc_id: risk.arcId,
        risk_type: risk.riskType,
        severity: risk.severity,
        description: risk.description,
      });
    }
  }

  return risks;
}

/**
 * Detect stagnation risk
 */
async function detectStagnation(arcId: string, dbUserId: string): Promise<LifeArcRisk | null> {
  // Get last 3 checkpoints
  const { data: checkpoints } = await supabaseAdmin
    .from("life_arc_checkpoints")
    .select("*")
    .eq("arc_id", arcId)
    .order("date", { ascending: false })
    .limit(3);

  if (!checkpoints || checkpoints.length < 2) return null;

  // Check if progress is flat or declining
  const progressScores = checkpoints.map((c) => c.progress_score || 0);
  const isFlat = progressScores.every((score, idx) => {
    if (idx === 0) return true;
    return Math.abs(score - progressScores[idx - 1]) < 5;
  });

  const isDeclining = progressScores[0] < progressScores[progressScores.length - 1] - 10;

  if (isFlat && progressScores[0] < 30) {
    return {
      arcId,
      riskType: "stagnation",
      severity: 3,
      description: "Arc progress has been flat for multiple checkpoints. Consider adjusting approach or breaking down quests.",
    };
  }

  if (isDeclining) {
    return {
      arcId,
      riskType: "stagnation",
      severity: 4,
      description: "Arc progress is declining. May need to reassess goals or reduce scope.",
    };
  }

  // Check quest completion rate
  const { data: quests } = await supabaseAdmin
    .from("life_arc_quests")
    .select("*")
    .eq("arc_id", arcId);

  if (quests) {
    const openCount = quests.filter((q) => q.status === "open" || q.status === "in_progress").length;
    const doneCount = quests.filter((q) => q.status === "done").length;
    const totalCount = quests.length;

    if (totalCount > 5 && doneCount === 0 && openCount > 5) {
      return {
        arcId,
        riskType: "stagnation",
        severity: 3,
        description: "Many open quests but none completed. May indicate overwhelm or lack of focus.",
      };
    }
  }

  return null;
}

/**
 * Detect regression risk
 */
async function detectRegression(arcId: string, dbUserId: string): Promise<LifeArcRisk | null> {
  // Check recent checkpoints for risk flags
  const { data: recentCheckpoint } = await supabaseAdmin
    .from("life_arc_checkpoints")
    .select("*")
    .eq("arc_id", arcId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentCheckpoint && recentCheckpoint.risk_flags) {
    const riskFlags = recentCheckpoint.risk_flags as string[];
    if (riskFlags.includes("relapse") || riskFlags.includes("burnout") || riskFlags.includes("crisis")) {
      return {
        arcId,
        riskType: "regression",
        severity: 4,
        description: `Recent risk flags detected: ${riskFlags.join(", ")}. Arc may be regressing.`,
      };
    }
  }

  return null;
}




