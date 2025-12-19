// Parallel Life Simulator - Experience v9
// lib/simulation/parallel.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getTwinModel } from "@/lib/twin/engine";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { generateFutureSelfPrediction } from "@/lib/future-self/model";
import { callAIJson } from "@/lib/ai/call";

export interface SimulationScenario {
  userId: string;
  scenario: string;
  hypothesis?: string;
}

export interface ParallelSimulationResult {
  baseline: {
    narrative: string;
    risks: string[];
    opportunities: string[];
    timeline: Array<{
      month: number;
      events: string[];
      metrics: Record<string, number>;
    }>;
    predictedDeltas: {
      income?: number;
      xp?: number;
      focus?: number;
      burnoutProbability?: number;
    };
  };
  hypothetical?: {
    narrative: string;
    risks: string[];
    opportunities: string[];
    timeline: Array<{
      month: number;
      events: string[];
      metrics: Record<string, number>;
    }>;
    predictedDeltas: {
      income?: number;
      xp?: number;
      focus?: number;
      burnoutProbability?: number;
    };
  };
  comparison?: {
    narrative: string;
    keyDifferences: string[];
    recommendation: string;
  };
}

/**
 * Run parallel life simulation
 */
export async function runParallelLifeSimulation(
  input: SimulationScenario
): Promise<ParallelSimulationResult> {
  // 1. Load user TwinModel
  const twin = await getTwinModel(input.userId);
  if (!twin) {
    throw new Error("Twin model not found. Please generate it first.");
  }

  // 2. Load neural reality physiology patterns
  const ctx = await getWorkCortexContextForUser(input.userId);

  // 3. Load societal archetype norms
  // (Would fetch from societal layer)

  // 4. Load Future Self prediction
  const futureSelf = await generateFutureSelfPrediction(input.userId, 90);

  // 5. Generate baseline trajectory
  const systemPrompt = `You are running a parallel life simulation. Generate detailed trajectories for:
- Baseline: What happens if user continues current path
- Hypothetical: What happens if hypothesis is applied

For each trajectory, provide:
- Narrative (what happens)
- Risks (key risks to watch)
- Opportunities (windows to seize)
- Timeline (month-by-month events and metrics)
- Predicted deltas (changes in income, XP, focus, burnout probability)

Be specific and realistic.`;

  const userPrompt = `Scenario: ${input.scenario}
${input.hypothesis ? `Hypothesis: ${input.hypothesis}` : ""}

User Twin:
- Strengths: ${JSON.stringify(twin.strengths)}
- Weaknesses: ${JSON.stringify(twin.weaknesses)}
- Risk Patterns: ${JSON.stringify(twin.riskPatterns)}
- Decision Patterns: ${JSON.stringify(twin.decisionPatterns)}

Current State:
- Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
- Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}

Future Self Prediction:
- Burnout Probability: ${futureSelf.burnoutProbability.projected}
- Goal Likelihood: ${JSON.stringify(futureSelf.goalLikelihood.slice(0, 3))}

Generate parallel simulation.`;

  const response = await callAIJson<ParallelSimulationResult>({
    userId: input.userId,
    feature: "parallel_simulation",
    systemPrompt,
    userPrompt,
    maxTokens: 3000,
    temperature: 0.8,
  });

  if (!response.success || !response.data) {
    // Fallback
    return {
      baseline: {
        narrative: "Simulation unavailable",
        risks: [],
        opportunities: [],
        timeline: [],
        predictedDeltas: {},
      },
    };
  }

  const result = response.data;

  // 6. Store simulation
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", input.userId)
    .maybeSingle();

  const dbUserId = userRow?.id || input.userId;

  await supabaseAdmin.from("life_simulations").insert({
    user_id: dbUserId,
    scenario: input.scenario,
    hypothesis: input.hypothesis || null,
    result: result,
  });

  return result;
}



