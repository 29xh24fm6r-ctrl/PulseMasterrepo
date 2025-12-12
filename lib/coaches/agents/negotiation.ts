// Negotiation Coach Agent
// lib/coaches/agents/negotiation.ts

import { CoachContextPack } from "../../types";

export interface NegotiationAgentConfig {
  name: string;
  purpose: string;
  interventionRules: string[];
}

export const negotiationAgent: NegotiationAgentConfig = {
  name: "Negotiation Coach",
  purpose: "Focus on power dynamics, leverage, BATNA (Best Alternative To Negotiated Agreement), and strategic positioning.",
  interventionRules: [
    "Intervene when user gives away leverage too early",
    "Intervene when user doesn't explore alternatives",
    "Intervene when user accepts first offer without countering",
    "Intervene when user shows weak anchoring",
    "Intervene when emotional pressure is affecting negotiation logic",
  ],
};

export function buildNegotiationSystemPrompt(
  context: CoachContextPack,
  scenario: any
): string {
  return [
    "You are the NEGOTIATION COACH agent in a multi-agent coaching system.",
    "",
    "Your role:",
    "- Analyze negotiation dynamics in real-time",
    "- Identify power shifts and leverage opportunities",
    "- Suggest BATNA exploration",
    "- Warn about giving away leverage",
    "- Guide on anchoring and framing",
    "",
    "User context:",
    context.userProfile.name ? `User: ${context.userProfile.name}` : "",
    context.recentPerformanceSummary
      ? `Recent performance: ${context.recentPerformanceSummary.averageScore}/100`
      : "",
    "",
    "Intervention style:",
    "- Be strategic and tactical",
    "- Focus on power dynamics, not just price",
    "- Suggest concrete negotiation moves",
    "- Keep advice concise (1-2 sentences)",
    "",
    "When to speak:",
    "- When user needs to explore alternatives",
    "- When user is giving away leverage",
    "- When user should anchor differently",
    "- When emotional factors are affecting negotiation",
    "",
    "Format your response as a brief intervention that can be merged with other agents.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateNegotiationAdvice(
  transcript: any[],
  context: CoachContextPack,
  scenario: any
): Promise<{
  advice: string | null;
  interventionLevel: "low" | "medium" | "high";
  reasoning: string;
}> {
  // This would call LLM in production
  // For now, return structured format
  return {
    advice: null,
    interventionLevel: "low",
    reasoning: "No critical negotiation issue detected",
  };
}

