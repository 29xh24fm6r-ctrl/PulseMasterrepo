// lib/langgraph/nodes/observe.ts
// Observer node: Analyze current situation and identify patterns

import type { OmegaState, Observation, ReasoningStep } from "../types";
import { omegaModel } from "../model";
import { parseJsonObject } from "../utils";

const model = omegaModel({ temperature: 0.3 });

export async function observeNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  try {
    const prompt = `You are the Observer module of Pulse Omega.

Analyze the current situation and identify what's actually happening.

SIGNAL: ${JSON.stringify(state.signal)}
RECENT CONTEXT: ${JSON.stringify(state.userContext?.recentOutcomes?.slice(0, 5) || [])}

What patterns do you see? What's the user's current state?

Respond with JSON only:
{
  "observations": [
    {
      "type": "pattern|anomaly|success|failure|opportunity|risk",
      "description": "what you observed",
      "confidence": 0.0-1.0,
      "evidence": "what supports this"
    }
  ],
  "current_state_assessment": "summary of where things stand"
}`;

    const response = await model.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const parsed = parseJsonObject(content);

    const step: ReasoningStep = {
      node: "observer",
      input: { signal: state.signal?.signalType },
      output: { observationCount: parsed.observations?.length || 0 },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return {
      observations: (parsed.observations || []) as Observation[],
      reasoningTrace: [step],
    };
  } catch (error) {
    return {
      errors: [`Observer error: ${error}`],
      observations: [],
      reasoningTrace: [
        {
          node: "observer",
          input: { signal: state.signal?.signalType },
          output: { error: String(error) },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
