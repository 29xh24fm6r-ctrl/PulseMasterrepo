// lib/langgraph/nodes/evolve.ts
// Evolver node: Propose improvements based on cognitive limits

import type { OmegaState, Improvement, ReasoningStep } from "../types";
import { omegaModel } from "../model";
import { parseJsonObject } from "../utils";

const model = omegaModel({ temperature: 0.3 });

export async function evolveNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  if (state.cognitiveIssues.length === 0) {
    return {
      proposedImprovements: [],
      reasoningTrace: [
        {
          node: "evolver",
          input: { cognitiveIssues: 0 },
          output: { skipped: "No cognitive issues to address" },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  try {
    const prompt = `You are the Evolver module of Pulse Omega.

Propose improvements based on identified cognitive limits.

COGNITIVE LIMITS: ${JSON.stringify(state.cognitiveIssues)}
SIMULATIONS: ${JSON.stringify(state.simulations)}
CURRENT STRATEGIES: ${JSON.stringify(state.userContext?.strategies?.slice(0, 5) || [])}

How can Omega get better? What should change?

Respond with JSON only:
{
  "improvements": [
    {
      "type": "prompt_adjustment|strategy_update|threshold_change|new_pattern",
      "target": "what component to improve",
      "currentState": {},
      "proposedChange": {},
      "expectedImpact": "what gets better",
      "risk": "what could go wrong"
    }
  ]
}

If no improvements needed, return empty array.`;

    const response = await model.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const parsed = parseJsonObject(content);

    const step: ReasoningStep = {
      node: "evolver",
      input: { cognitiveIssues: state.cognitiveIssues.length },
      output: { improvementsProposed: parsed.improvements?.length || 0 },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return {
      proposedImprovements: (parsed.improvements || []) as Improvement[],
      reasoningTrace: [step],
    };
  } catch (error) {
    return {
      errors: [`Evolution error: ${error}`],
      proposedImprovements: [],
      reasoningTrace: [
        {
          node: "evolver",
          input: {},
          output: { error: String(error) },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
