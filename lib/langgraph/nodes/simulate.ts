// lib/langgraph/nodes/simulate.ts
// Simulator node: Test outcomes of executing drafts

import type { OmegaState, Simulation, ReasoningStep } from "../types";
import { omegaModel } from "../model";
import { parseJsonObject } from "../utils";

const model = omegaModel({ temperature: 0.4 });

export async function simulateNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  if (!state.draft) {
    return {
      simulations: [],
      reasoningTrace: [
        {
          node: "simulator",
          input: {},
          output: { skipped: "No draft to simulate" },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  try {
    const prompt = `You are the Simulator module of Pulse Omega.

Test what happens if we execute this draft.

DRAFT: ${JSON.stringify(state.draft)}
USER CONTEXT: ${JSON.stringify(state.userContext?.goals?.slice(0, 3) || [])}
COGNITIVE ISSUES: ${JSON.stringify(state.cognitiveIssues)}

Simulate outcomes. Consider multiple scenarios.

Respond with JSON only:
{
  "simulations": [
    {
      "scenario": "description of scenario",
      "probability": 0.0-1.0,
      "predictedOutcome": "what happens",
      "risks": ["risk1", "risk2"],
      "opportunities": ["opp1", "opp2"]
    }
  ],
  "recommendation": "proceed|modify|abort",
  "reasoning": "why"
}`;

    const response = await model.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const parsed = parseJsonObject(content);

    const step: ReasoningStep = {
      node: "simulator",
      input: { draftTitle: state.draft.title },
      output: { simCount: parsed.simulations?.length || 0, recommendation: parsed.recommendation },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return {
      simulations: (parsed.simulations || []) as Simulation[],
      reasoningTrace: [step],
    };
  } catch (error) {
    return {
      errors: [`Simulation error: ${error}`],
      simulations: [],
      reasoningTrace: [
        {
          node: "simulator",
          input: { draft: state.draft?.title },
          output: { error: String(error) },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
