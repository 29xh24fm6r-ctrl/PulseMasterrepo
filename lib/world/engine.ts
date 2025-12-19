// World-Scale Mind Engine - Experience v8
// lib/world/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getTwinModel } from "@/lib/twin/engine";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { callAIJson } from "@/lib/ai/call";

export interface WorldInfluence {
  stressFronts: Array<{
    name: string;
    severity: "low" | "medium" | "high";
    timeframe: string;
    description: string;
  }>;
  focusHighs: Array<{
    name: string;
    intensity: number;
    timeframe: string;
    description: string;
  }>;
  burnoutRiskSpikes: Array<{
    name: string;
    risk: number;
    timeframe: string;
    description: string;
  }>;
  opportunityWindows: Array<{
    name: string;
    probability: number;
    timeframe: string;
    description: string;
  }>;
  bestEnergyHours: Array<{
    day: string;
    hours: string;
    energy: number;
  }>;
}

/**
 * Compute world influence for user
 */
export async function computeWorldInfluenceForUser(
  userId: string
): Promise<WorldInfluence> {
  // Pull world signals
  const { data: worldSignals } = await supabaseAdmin
    .from("world_signals")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(20);

  // Pull world patterns
  const { data: worldPatterns } = await supabaseAdmin
    .from("world_patterns")
    .select("*");

  // Pull user's TwinModel
  const twin = await getTwinModel(userId);

  // Pull Cortex context
  const ctx = await getWorkCortexContextForUser(userId);

  // Pull user's world adjustments
  const { data: userAdjustments } = await supabaseAdmin
    .from("user_world_adjustments")
    .select("*, world_patterns:pattern_code(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Generate Life Weather Report
  const systemPrompt = `You are generating a "Life Weather Report" for a user based on:
- Global world signals (economic, seasonal, cultural, behavioral)
- World patterns (macro trends)
- User's personal patterns (from their AI Twin)
- User's current state (emotion, energy, work patterns)

Generate:
- Stress fronts (upcoming periods of high stress)
- Focus highs (optimal periods for deep work)
- Burnout risk spikes (when burnout risk increases)
- Opportunity windows (favorable periods for action)
- Best energy hours (optimal times for high-performance work)

Be specific with timeframes and actionable.`;

  const userPrompt = `World Signals:
${JSON.stringify(worldSignals?.slice(0, 5) || [])}

World Patterns:
${JSON.stringify(worldPatterns?.slice(0, 3) || [])}

User Twin:
- Strengths: ${JSON.stringify(twin?.strengths || [])}
- Risk Patterns: ${JSON.stringify(twin?.riskPatterns || [])}

Current State:
- Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
- Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}

User Adjustments:
${JSON.stringify(userAdjustments || [])}

Generate Life Weather Report.`;

  const response = await callAIJson<{
    stressFronts: Array<{
      name: string;
      severity: "low" | "medium" | "high";
      timeframe: string;
      description: string;
    }>;
    focusHighs: Array<{
      name: string;
      intensity: number;
      timeframe: string;
      description: string;
    }>;
    burnoutRiskSpikes: Array<{
      name: string;
      risk: number;
      timeframe: string;
      description: string;
    }>;
    opportunityWindows: Array<{
      name: string;
      probability: number;
      timeframe: string;
      description: string;
    }>;
    bestEnergyHours: Array<{
      day: string;
      hours: string;
      energy: number;
    }>;
  }>({
    userId,
    feature: "world_influence",
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    // Fallback
    return {
      stressFronts: [],
      focusHighs: [],
      burnoutRiskSpikes: [],
      opportunityWindows: [],
      bestEnergyHours: [],
    };
  }

  return response.data;
}



