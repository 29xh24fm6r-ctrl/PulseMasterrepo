// lib/langgraph/nodes/diagnose.ts
// Diagnoser node: Identify cognitive limits and weaknesses

import type { OmegaState, CognitiveLimit, ReasoningStep } from "../types";
import { omegaJsonModel } from "../model";
import { parseJsonObject } from "../utils";

const model = omegaJsonModel();

export async function diagnoseNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  try {
    const prompt = `You are the Diagnoser module of Pulse Omega.

Identify cognitive limits and weaknesses in the reasoning so far.

REASONING TRACE: ${JSON.stringify(state.reasoningTrace)}
OBSERVATIONS: ${JSON.stringify(state.observations)}
DRAFT CONFIDENCE: ${state.draft?.confidence || "N/A"}

Where might we be wrong? What patterns might we be missing?

Respond with JSON only:
{
  "cognitive_limits": [
    {
      "type": "prediction_blind_spot|domain_weakness|timing_error|confidence_miscalibration",
      "description": "the specific weakness",
      "severity": "low|medium|high",
      "evidence": ["trace that shows this"],
      "suggestedRemedy": "how to address it"
    }
  ]
}

If no issues found, return empty array.`;

    const response = await model.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const parsed = parseJsonObject(content);

    const step: ReasoningStep = {
      node: "diagnoser",
      input: { traceLength: state.reasoningTrace.length },
      output: { issuesFound: parsed.cognitive_limits?.length || 0 },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return {
      cognitiveIssues: (parsed.cognitive_limits || []) as CognitiveLimit[],
      reasoningTrace: [step],
    };
  } catch (error) {
    return {
      errors: [`Diagnosis error: ${error}`],
      cognitiveIssues: [],
      reasoningTrace: [
        {
          node: "diagnoser",
          input: {},
          output: { error: String(error) },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
