// Multi-Agent Coordination Engine
// lib/coaches/multiAgentEngine.ts

import { CoachContextPack, RoleplayMessage } from "../types";
import { buildNegotiationSystemPrompt, generateNegotiationAdvice } from "./agents/negotiation";
import { buildEmotionalSystemPrompt, generateEmotionalAdvice } from "./agents/emotional";
import { buildStrategySystemPrompt, generateStrategyAdvice } from "./agents/strategy";
import { callAI } from "@/lib/ai/call";
import { llmComplete } from "@/lib/llm/client";

export type AgentType = "sales" | "negotiation" | "emotional" | "strategy";

export interface AgentContribution {
  agentType: AgentType;
  advice: string | null;
  interventionLevel: "low" | "medium" | "high";
  reasoning?: string;
  emotionalState?: string;
}

export interface MultiAgentResponse {
  unifiedMessage: string;
  agentContributions: AgentContribution[];
  shouldShowInlineCommentary: boolean;
}

/**
 * Coordinate multiple coaching agents to provide unified advice
 */
export async function coordinateMultiAgent(
  userId: string,
  agents: AgentType[],
  transcript: RoleplayMessage[],
  context: CoachContextPack,
  scenario: any,
  userMessage: string
): Promise<MultiAgentResponse> {
  // Generate advice from each active agent
  const contributions: AgentContribution[] = [];

  for (const agentType of agents) {
    try {
      let contribution: AgentContribution | null = null;

      switch (agentType) {
        case "negotiation":
          contribution = await generateAgentAdvice(
            userId,
            agentType,
            buildNegotiationSystemPrompt(context, scenario),
            transcript,
            userMessage
          );
          break;
        case "emotional":
          contribution = await generateAgentAdvice(
            userId,
            agentType,
            buildEmotionalSystemPrompt(context, scenario),
            transcript,
            userMessage
          );
          break;
        case "strategy":
          contribution = await generateAgentAdvice(
            userId,
            agentType,
            buildStrategySystemPrompt(context, scenario),
            transcript,
            userMessage
          );
          break;
        case "sales":
          // Sales coach uses existing roleplay engine
          contribution = {
            agentType: "sales",
            advice: null, // Will be handled by main roleplay flow
            interventionLevel: "low",
          };
          break;
      }

      if (contribution) {
        contributions.push(contribution);
      }
    } catch (error) {
      console.error(`[MultiAgent] Error generating advice from ${agentType}:`, error);
      // Continue with other agents
    }
  }

  // Filter and weight contributions
  const relevantContributions = contributions.filter(
    (c) => c.interventionLevel !== "low" || c.advice !== null
  );

  // Merge contributions into unified message
  const unifiedMessage = await mergeAgentContributions(
    relevantContributions,
    transcript,
    userMessage
  );

  // Determine if inline commentary should be shown
  const shouldShowInlineCommentary =
    relevantContributions.length > 1 &&
    relevantContributions.some((c) => c.interventionLevel === "high");

  return {
    unifiedMessage,
    agentContributions: contributions,
    shouldShowInlineCommentary,
  };
}

/**
 * Generate advice from a single agent
 */
async function generateAgentAdvice(
  userId: string,
  agentType: AgentType,
  systemPrompt: string,
  transcript: RoleplayMessage[],
  userMessage: string
): Promise<AgentContribution> {
  const transcriptText = transcript
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = [
    "Analyze the conversation and provide your intervention:",
    "",
    "Transcript:",
    transcriptText,
    "",
    "Latest user message:",
    userMessage,
    "",
    "Provide:",
    "1. Brief advice (1-2 sentences) if intervention is needed, or null if not",
    "2. Intervention level: 'low', 'medium', or 'high'",
    "3. Brief reasoning",
    "",
    "Respond in JSON:",
    '{"advice": "string or null", "interventionLevel": "low|medium|high", "reasoning": "string"}',
  ].join("\n");

  try {
    const result = await callAI({
      userId,
      systemPrompt,
      userPrompt: prompt,
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 200,
      feature: "coach_multi_agent",
      jsonMode: true,
    });

    if (result.success && result.content) {
      const json = JSON.parse(result.content);
      return {
        agentType,
        advice: json.advice || null,
        interventionLevel: json.interventionLevel || "low",
        reasoning: json.reasoning,
      };
    }
  } catch (error) {
    console.error(`[MultiAgent] Error calling AI for ${agentType}:`, error);
  }

  return {
    agentType,
    advice: null,
    interventionLevel: "low",
    reasoning: "Agent analysis unavailable",
  };
}

/**
 * Merge multiple agent contributions into a unified message
 */
async function mergeAgentContributions(
  contributions: AgentContribution[],
  transcript: RoleplayMessage[],
  userMessage: string
): Promise<string> {
  if (contributions.length === 0) {
    return "Continue the conversation naturally.";
  }

  if (contributions.length === 1 && contributions[0].advice) {
    return contributions[0].advice;
  }

  // Use LLM to merge multiple contributions
  const contributionsText = contributions
    .filter((c) => c.advice)
    .map((c) => `${c.agentType.toUpperCase()}: ${c.advice}`)
    .join("\n");

  const prompt = [
    "You are coordinating multiple coaching agents. Merge their advice into one unified, coherent message.",
    "",
    "Agent contributions:",
    contributionsText,
    "",
    "Context:",
    "User's latest message: " + userMessage,
    "",
    "Create a unified coaching message that:",
    "- Combines the best insights from each agent",
    "- Is coherent and actionable",
    "- Is concise (2-4 sentences)",
    "- Maintains the coaching tone",
    "",
    "Return only the unified message, no JSON, no formatting.",
  ].join("\n");

  try {
    const merged = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 300,
    });
    return merged || "Continue the conversation with the guidance provided.";
  } catch (error) {
    console.error("[MultiAgent] Error merging contributions:", error);
    // Fallback: use first non-null advice
    const firstAdvice = contributions.find((c) => c.advice)?.advice;
    return firstAdvice || "Continue the conversation naturally.";
  }
}

