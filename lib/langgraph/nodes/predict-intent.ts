// lib/langgraph/nodes/predict-intent.ts
// Intent Predictor node: Predict what user needs before they ask

import type { OmegaState, Intent, ReasoningStep } from "../types";
import { omegaModel } from "../model";
import { parseJsonObject } from "../utils";
import { recordConfidencePrediction } from "@/lib/omega/confidence-ledger";

const model = omegaModel({ temperature: 0.3 });

export async function predictIntentNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  try {
    const timeContext = {
      now: new Date().toISOString(),
      dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }),
      timeOfDay: new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening",
    };

    const prompt = `You are the Intent Prediction module of Pulse Omega.

Given a signal and context, predict what the user needs before they ask.

SIGNAL: ${JSON.stringify(state.signal)}
OBSERVATIONS: ${JSON.stringify(state.observations)}
USER GOALS: ${JSON.stringify(state.userContext?.goals?.slice(0, 5) || [])}
TIME CONTEXT: ${JSON.stringify(timeContext)}

Respond with JSON only:
{
  "predicted_need": "clear description of what user probably wants",
  "confidence": 0.0-1.0,
  "reasoning": "why you predict this",
  "suggested_action": "specific action to take",
  "draft_type": "meeting_prep|email|report|action_plan|summary|task",
  "urgency": "immediate|soon|when_convenient"
}`;

    const response = await model.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const parsed = parseJsonObject(content);

    const intent: Intent = {
      signalId: state.signal?.id || "",
      predictedNeed: parsed.predicted_need,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      suggestedAction: parsed.suggested_action,
      draftType: parsed.draft_type,
      urgency: parsed.urgency,
    };

    // Record confidence prediction for calibration tracking
    if (intent.confidence) {
      await recordConfidencePrediction({
        userId: state.userId,
        sessionId: state.sessionId,
        node: "intent_predictor",
        predictionType: "intent",
        predictedConfidence: intent.confidence,
        contextSnapshot: {
          signalType: state.signal?.signalType,
          observationCount: state.observations.length,
        },
      });
    }

    const step: ReasoningStep = {
      node: "intent_predictor",
      input: { signalType: state.signal?.signalType },
      output: { predictedNeed: intent.predictedNeed, confidence: intent.confidence },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return {
      intent,
      reasoningTrace: [step],
    };
  } catch (error) {
    return {
      errors: [`Intent prediction error: ${error}`],
      reasoningTrace: [
        {
          node: "intent_predictor",
          input: { signal: state.signal?.signalType },
          output: { error: String(error) },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
