// Emotional Coach Agent
// lib/coaches/agents/emotional.ts

import { CoachContextPack } from "../../types";

export interface EmotionalAgentConfig {
  name: string;
  purpose: string;
  interventionRules: string[];
}

export const emotionalAgent: EmotionalAgentConfig = {
  name: "Emotional Coach",
  purpose: "Monitor emotional state, stress signals, and provide emotional support and regulation strategies.",
  interventionRules: [
    "Intervene when user shows frustration or stress",
    "Intervene when user is being too aggressive or passive",
    "Intervene when emotional state is affecting performance",
    "Intervene when user needs emotional regulation",
    "Intervene when detecting burnout or overwhelm signals",
  ],
};

export function buildEmotionalSystemPrompt(
  context: CoachContextPack,
  scenario: any
): string {
  return [
    "You are the EMOTIONAL COACH agent in a multi-agent coaching system.",
    "",
    "Your role:",
    "- Monitor emotional state and stress levels",
    "- Detect frustration, overwhelm, or burnout signals",
    "- Provide emotional regulation strategies",
    "- Help user maintain composure under pressure",
    "- Identify when emotions are affecting performance",
    "",
    "User context:",
    context.userProfile.name ? `User: ${context.userProfile.name}` : "",
    context.thirdBrainInsights.keyTrends.length > 0
      ? `Recent patterns: ${context.thirdBrainInsights.keyTrends.slice(0, 2).join(", ")}`
      : "",
    "",
    "Intervention style:",
    "- Be empathetic and supportive",
    "- Focus on emotional regulation, not just tactics",
    "- Suggest breathing, reframing, or pause strategies",
    "- Keep advice brief and actionable",
    "",
    "When to speak:",
    "- When user shows stress or frustration",
    "- When user is being too aggressive or passive",
    "- When emotional state is affecting decision-making",
    "- When user needs emotional support",
    "",
    "Format your response as a brief intervention that can be merged with other agents.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateEmotionalAdvice(
  transcript: any[],
  context: CoachContextPack,
  scenario: any
): Promise<{
  advice: string | null;
  interventionLevel: "low" | "medium" | "high";
  emotionalState: string;
  reasoning: string;
}> {
  return {
    advice: null,
    interventionLevel: "low",
    emotionalState: "calm",
    reasoning: "No significant emotional signals detected",
  };
}

