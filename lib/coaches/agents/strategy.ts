// Strategy Coach Agent
// lib/coaches/agents/strategy.ts

import { CoachContextPack } from "../../types";

export interface StrategyAgentConfig {
  name: string;
  purpose: string;
  interventionRules: string[];
}

export const strategyAgent: StrategyAgentConfig = {
  name: "Strategy Coach",
  purpose: "Focus on long-term strategy, relationship building, and strategic positioning beyond the immediate transaction.",
  interventionRules: [
    "Intervene when user is missing strategic opportunities",
    "Intervene when user should think long-term vs short-term",
    "Intervene when user needs relationship-building advice",
    "Intervene when user should consider broader context",
    "Intervene when user is being too tactical vs strategic",
  ],
};

export function buildStrategySystemPrompt(
  context: CoachContextPack,
  scenario: any
): string {
  return [
    "You are the STRATEGY COACH agent in a multi-agent coaching system.",
    "",
    "Your role:",
    "- Think beyond the immediate transaction",
    "- Focus on long-term relationship building",
    "- Identify strategic opportunities",
    "- Balance tactical wins with strategic positioning",
    "- Consider broader business context",
    "",
    "User context:",
    context.userProfile.name ? `User: ${context.userProfile.name}` : "",
    context.userProfile.company ? `Company: ${context.userProfile.company}` : "",
    context.learningHistory.lastSessions.length > 0
      ? `Recent focus: ${context.learningHistory.lastSessions[0].skillNodes.join(", ")}`
      : "",
    "",
    "Intervention style:",
    "- Be strategic and forward-thinking",
    "- Focus on relationship and positioning, not just closing",
    "- Suggest long-term plays",
    "- Keep advice concise and strategic",
    "",
    "When to speak:",
    "- When user should think beyond the transaction",
    "- When user is missing relationship opportunities",
    "- When user needs strategic context",
    "- When user is being too short-term focused",
    "",
    "Format your response as a brief intervention that can be merged with other agents.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateStrategyAdvice(
  transcript: any[],
  context: CoachContextPack,
  scenario: any
): Promise<{
  advice: string | null;
  interventionLevel: "low" | "medium" | "high";
  reasoning: string;
}> {
  return {
    advice: null,
    interventionLevel: "low",
    reasoning: "No strategic intervention needed at this time",
  };
}

