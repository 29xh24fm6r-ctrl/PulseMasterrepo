// AI Twin Simulation - Experience v6
// lib/twin/simulation.ts

import { TwinModel } from "./engine";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { generateFutureSelfPrediction } from "@/lib/future-self/model";
import { callAIJson } from "@/lib/ai/call";

export interface SimulationInput {
  userId: string;
  scenario: string; // e.g., "next 90 days if I stay as-is"
  hypothesis?: string; // e.g., "if I commit to 5 deep work blocks per week"
}

export interface SimulationResult {
  narrative: string;
  keyRisks: string[];
  opportunities: string[];
  recommendedHabits: string[];
  predictedMetricsDelta: Record<string, any>; // e.g., XP, income, health proxies
}

/**
 * Run twin simulation
 */
export async function runTwinSimulation(
  input: SimulationInput
): Promise<SimulationResult> {
  // Load TwinModel
  const twin = await getTwinModel(input.userId);
  if (!twin) {
    throw new Error("Twin model not found. Please generate it first.");
  }

  // Load Cortex context
  const ctx = await getWorkCortexContextForUser(input.userId);

  // Load Future Self prediction
  const futureSelf = await generateFutureSelfPrediction(input.userId, 90);

  // Generate simulation
  const systemPrompt = `You are simulating a user's future trajectory using their AI Twin model.

Generate:
- A narrative of what will happen (baseline trajectory)
- If hypothesis provided, compare baseline vs hypothetical trajectory
- Key risks to watch
- Opportunities to seize
- Recommended habits to adopt
- Predicted metric changes (XP, productivity, health proxies)

Be specific and actionable.`;

  const userPrompt = `User Twin Model:
- Strengths: ${JSON.stringify(twin.strengths)}
- Weaknesses: ${JSON.stringify(twin.weaknesses)}
- Risk Patterns: ${JSON.stringify(twin.riskPatterns)}
- Decision Patterns: ${JSON.stringify(twin.decisionPatterns)}

Scenario: ${input.scenario}
${input.hypothesis ? `Hypothesis: ${input.hypothesis}` : ""}

Future Self Prediction:
- Burnout Probability: ${futureSelf.burnoutProbability.projected}
- Goal Likelihood: ${JSON.stringify(futureSelf.goalLikelihood.slice(0, 3))}

Generate the simulation.`;

  const response = await callAIJson<{
    narrative: string;
    keyRisks: string[];
    opportunities: string[];
    recommendedHabits: string[];
    predictedMetricsDelta: Record<string, any>;
  }>({
    userId: input.userId,
    feature: "twin_simulation",
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
    temperature: 0.8,
  });

  if (!response.success || !response.data) {
    // Fallback
    return {
      narrative: "Simulation unavailable",
      keyRisks: [],
      opportunities: [],
      recommendedHabits: [],
      predictedMetricsDelta: {},
    };
  }

  return response.data;
}

// Import getTwinModel
import { getTwinModel } from "./engine";



