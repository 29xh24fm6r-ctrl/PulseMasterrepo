// Safe Coach Wrapper
// lib/coaches/safe-coach-wrapper.ts

import { runSafetyPreCheck, runSafetyPostCheck } from "@/lib/safety/engine";
import { injectSafetyIntoSystemPrompt } from "@/lib/safety/prompt";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface RunSafeCoachInteractionParams {
  userId?: string;
  coachId: string;
  personaId?: string;
  messages: ChatMessage[];
  llmCall: (messages: ChatMessage[]) => Promise<string>;
}

/**
 * Extract latest user input from messages
 */
function extractLatestUserInput(messages: ChatMessage[]): string {
  const userMessages = messages.filter((m) => m.role === "user");
  return userMessages[userMessages.length - 1]?.content || "";
}

/**
 * Build blocked response message
 */
function buildBlockedResponse(preCheck: any): string {
  return preCheck.boundaryMessage || "I can't help with that request. How else can I assist you?";
}

/**
 * Inject safety into system prompt
 */
async function injectSafetySystemPrompt(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const systemMessage = messages.find((m) => m.role === "system");
  
  if (systemMessage) {
    const safeSystemPrompt = await injectSafetyIntoSystemPrompt(systemMessage.content);
    return messages.map((m) =>
      m.role === "system" ? { ...m, content: safeSystemPrompt } : m
    );
  } else {
    // Add safety system prompt if none exists
    const safeSystemPrompt = await injectSafetyIntoSystemPrompt("");
    return [{ role: "system" as const, content: safeSystemPrompt }, ...messages];
  }
}

/**
 * Run safe coach interaction with pre/post safety checks
 */
export async function runSafeCoachInteraction(
  params: RunSafeCoachInteractionParams
): Promise<string> {
  const userInput = extractLatestUserInput(params.messages);

  // Pre-check user input
  const preCheck = await runSafetyPreCheck({
    userId: params.userId,
    coachId: params.coachId,
    personaId: params.personaId,
    userInput,
  });

  // If blocked, return boundary message
  if (!preCheck.allowed && preCheck.action === "block") {
    return buildBlockedResponse(preCheck);
  }

  // If route to help (self-harm), return help response
  if (preCheck.action === "route_to_help" && preCheck.boundaryMessage) {
    return preCheck.boundaryMessage;
  }

  // Inject safety into system prompt
  const safeMessages = await injectSafetySystemPrompt(params.messages);

  // Call LLM
  const rawOutput = await params.llmCall(safeMessages);

  // Post-check model output
  const postCheck = await runSafetyPostCheck({
    userId: params.userId,
    coachId: params.coachId,
    personaId: params.personaId,
    userInput,
    modelOutput: rawOutput,
  });

  return postCheck.finalText;
}




