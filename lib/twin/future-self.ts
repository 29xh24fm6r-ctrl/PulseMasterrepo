// AI Twin Future Self Messages - Experience v6
// lib/twin/future-self.ts

import { getTwinModel } from "./engine";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import { callAIJson } from "@/lib/ai/call";

export interface FutureSelfMessageInput {
  userId: string;
  situation: string; // description of current moment / temptation
}

export interface FutureSelfMessageOutput {
  message: string;
  tone: "calm" | "tough-love" | "hype";
  suggestedActions: string[];
}

/**
 * Generate future self message
 */
export async function generateFutureSelfMessage(
  input: FutureSelfMessageInput
): Promise<FutureSelfMessageOutput> {
  // Load TwinModel
  const twin = await getTwinModel(input.userId);
  if (!twin) {
    throw new Error("Twin model not found. Please generate it first.");
  }

  // Load Cortex context
  const ctx = await buildPulseCortexContext(input.userId);

  // Load Neural Reality state (if available)
  // const neuralState = await buildNeuralRealityState(input.userId);

  // Generate message
  const systemPrompt = `You are the user's Future Self - a wiser, more evolved version of themselves speaking back through time.

Your role:
- Speak with authority and wisdom
- Reference their patterns ("You usually bail here; let's not.")
- Be direct but supportive
- Choose tone: calm (for stress), tough-love (for procrastination), hype (for motivation)

Generate a short, powerful message (2-3 sentences) plus suggested actions.`;

  const userPrompt = `Current Situation: ${input.situation}

User's Twin Model:
- Strengths: ${JSON.stringify(twin.strengths)}
- Weaknesses: ${JSON.stringify(twin.weaknesses)}
- Risk Patterns: ${JSON.stringify(twin.riskPatterns)}
- Values: ${JSON.stringify(twin.values)}

Current Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
Current Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}

Generate a Future Self message.`;

  const response = await callAIJson<{
    message: string;
    tone: "calm" | "tough-love" | "hype";
    suggestedActions: string[];
  }>({
    userId: input.userId,
    feature: "future_self_message",
    systemPrompt,
    userPrompt,
    maxTokens: 500,
    temperature: 0.9,
  });

  if (!response.success || !response.data) {
    // Fallback
    return {
      message: "Your Future Self is here. Make the choice that future you will thank you for.",
      tone: "calm",
      suggestedActions: ["Take a moment to reflect", "Consider the long-term impact"],
    };
  }

  return response.data;
}



