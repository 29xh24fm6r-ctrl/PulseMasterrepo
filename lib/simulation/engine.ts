// Life Simulation Engine
// lib/simulation/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import { ScenarioConfig, SimulationResult } from "./types";
import { getScenario } from "./scenarios";
import { getCareerContextForSimulation } from "@/lib/career/integrations";

/**
 * Run life simulation
 */
export async function runLifeSimulation(
  userId: string,
  scenarioKey: string,
  customConfig: Record<string, any> | null,
  horizonDays = 30
): Promise<SimulationResult> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load scenario
  const baseScenario = getScenario(scenarioKey as any);
  
  // If scenario is "next_level" or similar, use career context
  let scenario: ScenarioConfig = baseScenario;
  if (scenarioKey === "next_level" || customConfig?.useNextLevel) {
    try {
      const careerCtx = await getCareerContextForSimulation(userId);
      if (careerCtx.nextLevel) {
        // Create a scenario that targets next level's requirements
        scenario = {
          key: "next_level",
          name: `Path to ${careerCtx.nextLevel.label}`,
          description: `Simulate behavior needed to reach ${careerCtx.nextLevel.label} level`,
          deltas: {
            // Target the next level's score requirement
            tasks_completed_per_day: 2,
            deep_work_hours_per_day: 1,
            relationship_touches_per_day: 1,
            stress_reduction: -0.1,
          },
        };
      }
    } catch (err) {
      console.warn("[Simulation] Failed to load career context:", err);
    }
  } else if (customConfig) {
    scenario = { ...baseScenario, deltas: { ...baseScenario.deltas, ...customConfig } };
  }

  // 2. Load baseline metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const baselineMetrics = await computeBaselineMetrics(userId, dbUserId, thirtyDaysAgo);

  // 3. Generate daily projections
  const dailyProjections = generateDailyProjections(
    baselineMetrics,
    scenario.deltas,
    horizonDays
  );

  // 4. Generate narrative summary using LLM
  const summary = await generateSimulationSummary(
    baselineMetrics,
    scenario,
    dailyProjections
  );

  return {
    scenario,
    horizonDays,
    baselineMetrics,
    dailyProjections,
    summary,
  };
}

/**
 * Compute baseline metrics from last 30 days
 */
async function computeBaselineMetrics(
  userId: string,
  dbUserId: string,
  startDate: Date
): Promise<Record<string, number>> {
  const metrics: Record<string, number> = {};

  // Deep work hours (try focus_sessions, fallback to coaching sessions)
  let totalDeepWorkMinutes = 0;
  try {
    const { data: focusSessions } = await supabaseAdmin
      .from("focus_sessions")
      .select("duration_minutes")
      .eq("user_id", dbUserId)
      .gte("started_at", startDate.toISOString());

    totalDeepWorkMinutes =
      focusSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
  } catch (err) {
    // Table doesn't exist, use coaching sessions as proxy
    const { data: coachingSessions } = await supabaseAdmin
      .from("coaching_sessions")
      .select("id")
      .eq("user_id", dbUserId)
      .gte("started_at", startDate.toISOString());

    // Estimate 30 min per session
    totalDeepWorkMinutes = (coachingSessions?.length || 0) * 30;
  }
  metrics.deep_work_hours_per_day = totalDeepWorkMinutes / (30 * 60);

  // Tasks completed
  const { count: completedTasks } = await supabaseAdmin
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUserId)
    .eq("status", "done")
    .gte("created_at", startDate.toISOString());

  metrics.tasks_completed_per_day = (completedTasks || 0) / 30;

  // Relationship touches (from contact_interaction_events)
  const { count: interactions } = await supabaseAdmin
    .from("contact_interaction_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUserId)
    .gte("occurred_at", startDate.toISOString());

  metrics.relationship_touches_per_day = (interactions || 0) / 30;

  // Average stress (from emo_states or emotional_checkins)
  const { data: emotions } = await supabaseAdmin
    .from("emo_states")
    .select("detected_emotion, intensity, valence")
    .eq("user_id", dbUserId)
    .gte("occurred_at", startDate.toISOString());

  if (emotions && emotions.length > 0) {
    // Map emotions to stress: stress/angry = high, calm/happy = low
    const stressScores = emotions.map((e) => {
      const emotion = (e.detected_emotion || "").toLowerCase();
      if (emotion.includes("stress") || emotion.includes("angry") || emotion.includes("anxious")) {
        return 0.8;
      } else if (emotion.includes("calm") || emotion.includes("happy") || emotion.includes("excited")) {
        return 0.2;
      }
      return 0.5; // neutral
    });
    metrics.avg_stress = stressScores.reduce((sum, s) => sum + s, 0) / stressScores.length;
  } else {
    metrics.avg_stress = 0.5; // Default
  }

  // Deals closed
  const { count: closedDeals } = await supabaseAdmin
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUserId)
    .eq("status", "won")
    .gte("updated_at", startDate.toISOString());

  metrics.deals_closed_per_month = closedDeals || 0;

  return metrics;
}

/**
 * Generate daily projections
 */
function generateDailyProjections(
  baseline: Record<string, number>,
  deltas: Record<string, any>,
  horizonDays: number
): Array<{ day: number; date: string; metrics: Record<string, number> }> {
  const projections: Array<{ day: number; date: string; metrics: Record<string, number> }> = [];

  for (let day = 1; day <= horizonDays; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);

    const metrics: Record<string, number> = {};

    // Apply deltas to baseline
    for (const [key, value] of Object.entries(baseline)) {
      const delta = deltas[key] || 0;
      metrics[key] = Math.max(0, value + delta);
    }

    // Add compound effects (e.g., more deep work → less stress over time)
    if (deltas.deep_work_hours_per_day && metrics.avg_stress) {
      const stressReduction = (deltas.deep_work_hours_per_day * day) / 100;
      metrics.avg_stress = Math.max(0, metrics.avg_stress - stressReduction);
    }

    projections.push({
      day,
      date: date.toISOString().split("T")[0],
      metrics,
    });
  }

  return projections;
}

/**
 * Generate simulation summary using LLM
 */
async function generateSimulationSummary(
  baseline: Record<string, number>,
  scenario: ScenarioConfig,
  projections: Array<{ day: number; metrics: Record<string, number> }>
): Promise<{
  narrative: string;
  pros: string[];
  cons: string[];
  risks: string[];
}> {
  const finalMetrics = projections[projections.length - 1]?.metrics || {};
  const improvements: string[] = [];
  const declines: string[] = [];

  for (const [key, finalValue] of Object.entries(finalMetrics)) {
    const baselineValue = baseline[key] || 0;
    if (finalValue > baselineValue * 1.1) {
      improvements.push(`${key} increases by ${((finalValue / baselineValue - 1) * 100).toFixed(0)}%`);
    } else if (finalValue < baselineValue * 0.9) {
      declines.push(`${key} decreases by ${((1 - finalValue / baselineValue) * 100).toFixed(0)}%`);
    }
  }

  const prompt = `You are Pulse, analyzing a life simulation scenario.

Scenario: ${scenario.name}
Description: ${scenario.description}

Baseline Metrics (current average):
${JSON.stringify(baseline, null, 2)}

Projected Metrics (after ${projections.length} days):
${JSON.stringify(finalMetrics, null, 2)}

Key Changes:
${improvements.length > 0 ? `Improvements: ${improvements.join(", ")}` : "No major improvements"}
${declines.length > 0 ? `Declines: ${declines.join(", ")}` : "No major declines"}

Generate a comprehensive analysis:
1. Narrative: 2-3 paragraph summary of what this scenario would look like
2. Pros: 3-5 benefits of this path
3. Cons: 3-5 drawbacks or tradeoffs
4. Risks: 3-5 potential risks or challenges

Return JSON:
{
  "narrative": "string",
  "pros": ["string", "string"],
  "cons": ["string", "string"],
  "risks": ["string", "string"]
}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete({
      messages: [
        {
          role: "system",
          content: "You are Pulse, an AI assistant that analyzes life simulation scenarios with insight and empathy.",
        },
        { role: "user", content: prompt },
      ],
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      narrative: parsed.narrative || "Simulation analysis unavailable",
      pros: Array.isArray(parsed.pros) ? parsed.pros : [],
      cons: Array.isArray(parsed.cons) ? parsed.cons : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    };
  } catch (err) {
    console.error("[Simulation] LLM summary failed:", err);
    return {
      narrative: "Unable to generate detailed analysis. Review metrics manually.",
      pros: improvements,
      cons: declines,
      risks: ["Analysis unavailable"],
    };
  }
}

