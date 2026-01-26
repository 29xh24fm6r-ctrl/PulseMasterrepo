// lib/langgraph/nodes/generate-draft.ts
// Draft Generator node: Create ready-to-use deliverables

import type { OmegaState, Draft, ReasoningStep } from "../types";
import { omegaCreativeModel } from "../model";
import { parseJsonObject } from "../utils";
import { recordConfidencePrediction } from "@/lib/omega/confidence-ledger";

const model = omegaCreativeModel();

export async function generateDraftNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  if (!state.intent) {
    return { errors: ["No intent to generate draft from"] };
  }

  try {
    const prompt = `You are the Draft Generation module of Pulse Omega.

Create a complete, ready-to-use deliverable based on the predicted intent.

INTENT: ${JSON.stringify(state.intent)}
SIGNAL CONTEXT: ${JSON.stringify(state.signal?.payload)}
USER PREFERENCES: ${JSON.stringify(state.userContext?.preferences || {})}

Generate a draft that the user could approve with one click.
Make it complete. Make it actionable.

Respond with JSON only:
{
  "title": "clear title",
  "draft_type": "${state.intent.draftType}",
  "content": {
    "summary": "brief overview",
    "sections": [
      {"heading": "section title", "body": "section content"}
    ],
    "action_items": ["item 1", "item 2"],
    "key_points": ["point 1", "point 2"]
  },
  "confidence": 0.0-1.0
}`;

    const response = await model.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const parsed = parseJsonObject(content);

    const draft: Draft = {
      intentId: state.intent.id || "",
      draftType: parsed.draft_type,
      title: parsed.title,
      content: parsed.content,
      confidence: parsed.confidence,
      status: "pending_review",
    };

    // Record confidence prediction for calibration tracking
    if (draft.confidence) {
      await recordConfidencePrediction({
        userId: state.userId,
        sessionId: state.sessionId,
        node: "draft_generator",
        predictionType: "draft",
        predictedConfidence: draft.confidence,
        contextSnapshot: {
          intentType: state.intent?.draftType,
          intentConfidence: state.intent?.confidence,
        },
      });
    }

    const step: ReasoningStep = {
      node: "draft_generator",
      input: { intentType: state.intent.draftType },
      output: { title: draft.title, confidence: draft.confidence },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return {
      draft,
      reasoningTrace: [step],
    };
  } catch (error) {
    return {
      errors: [`Draft generation error: ${error}`],
      reasoningTrace: [
        {
          node: "draft_generator",
          input: { intent: state.intent?.draftType },
          output: { error: String(error) },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
