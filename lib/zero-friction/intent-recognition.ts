// Intent Recognition Layer - Experience Ω
// lib/zero-friction/intent-recognition.ts

import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson } from "@/lib/ai/call";

export type IntentType =
  | "task"
  | "planning"
  | "emotional_regulation"
  | "relationship"
  | "learning"
  | "reflection"
  | "search"
  | "automation"
  | "stuck";

export interface IntentRecognition {
  intent: IntentType;
  confidence: number;
  routeTo: string;
  suggestedActions: string[];
}

/**
 * Recognize user intent from behavior and language
 */
export async function recognizeIntent(
  userId: string,
  input: {
    text?: string;
    voice?: string;
    actions?: string[];
    currentState?: Record<string, any>;
  }
): Promise<IntentRecognition> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Use LLM to recognize intent
  const systemPrompt = `You are recognizing user intent from their behavior and language.

Intent types:
- task: User wants to create/complete a task
- planning: User wants to plan or schedule
- emotional_regulation: User wants to manage emotions
- relationship: User wants to manage relationships
- learning: User wants to learn or understand
- reflection: User wants to reflect or journal
- search: User wants to find something
- automation: User wants Pulse to handle something
- stuck: User is stuck or confused

For each intent, provide:
- intent type
- confidence (0-1)
- routeTo (where to navigate)
- suggestedActions (what Pulse should do)`;

  const userPrompt = `User Input:
${input.text ? `Text: "${input.text}"` : ""}
${input.voice ? `Voice: "${input.voice}"` : ""}
${input.actions ? `Actions: ${JSON.stringify(input.actions)}` : ""}
${input.currentState ? `Current State: ${JSON.stringify(input.currentState)}` : ""}

Recognize intent.`;

  const response = await callAIJson<IntentRecognition>({
    userId,
    feature: "intent_recognition",
    systemPrompt,
    userPrompt,
    maxTokens: 300,
    temperature: 0.3,
  });

  if (!response.success || !response.data) {
    // Fallback
    return {
      intent: "task",
      confidence: 0.5,
      routeTo: "/canvas",
      suggestedActions: [],
    };
  }

  const recognition = response.data;

  // Log recognition
  await supabaseAdmin.from("intent_recognition_log").insert({
    user_id: dbUserId,
    detected_intent: recognition.intent,
    confidence: recognition.confidence,
    routed_to: recognition.routeTo,
  });

  return recognition;
}



