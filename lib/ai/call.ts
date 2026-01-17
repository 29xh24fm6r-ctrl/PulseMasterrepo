/**
 * AI Call Utility with Usage Tracking
 * lib/ai/call.ts
 * 
 * Use this for all AI calls to ensure usage is tracked
 */

import { getOpenAI } from "@/services/ai/openai";
import { trackAIUsage, canMakeAICall } from "@/services/usage";


export interface CallAIOptions {
  userId: string;
  feature: string;
  model?: string;
  messages: any[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export async function callAI({
  userId,
  feature,
  model = "gpt-4-turbo-preview",
  messages,
  maxTokens = 1000,
  temperature = 0.7,
  jsonMode = false,
}: CallAIOptions) {
  try {
    // Get OpenAI client
    const openai = await getOpenAI();

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: "json_object" } }),
    });

    const content = completion.choices[0]?.message?.content || null;
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;

    // Track usage
    await trackAIUsage(userId, feature, model, { prompt_tokens: inputTokens, completion_tokens: outputTokens });

    return {
      success: true,
      content,
      inputTokens,
      outputTokens,
      tokensUsed: inputTokens + outputTokens,
    };
  } catch (error: any) {
    console.error("[callAI] Error:", error);
    return {
      success: false,
      content: null,
      error: error.message || "AI call failed",
    };
  }
}

/**
 * Call AI expecting JSON response
 * Automatically parses and returns typed result
 */
export async function callAIJson<T = any>(
  options: CallAIOptions
): Promise<{ success: boolean; data: T | null; error?: string }> {
  const result = await callAI({ ...options, jsonMode: true });

  if (!result.success || !result.content) {
    return { success: false, data: null, error: result.error };
  }

  try {
    // Try to extract JSON from response (handles markdown code blocks)
    let jsonStr = result.content;
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON
      const rawMatch = jsonStr.match(/[\[{][\s\S]*[\]}]/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }

    const data = JSON.parse(jsonStr) as T;
    return { success: true, data };
  } catch (parseError) {
    console.error("[callAIJson] Parse error:", parseError);
    return {
      success: false,
      data: null,
      error: "Failed to parse AI response as JSON",
    };
  }
}

/**
 * Lightweight sentiment analysis
 */
export async function analyzeSentiment(
  userId: string,
  texts: string[]
): Promise<{
  overall: "very_negative" | "negative" | "neutral" | "positive" | "very_positive";
  themes: string[];
} | null> {
  if (texts.length === 0) {
    return { overall: "neutral", themes: [] };
  }

  const combinedText = texts.slice(0, 10).join("\n---\n").substring(0, 3000);

  const result = await callAIJson<{
    sentiment: string;
    themes: string[];
  }>({
    userId,
    feature: "third_brain_sentiment",
    systemPrompt: `You analyze journal entries for sentiment and themes. Respond with JSON only.`,
    userPrompt: `Analyze these journal entries:

${combinedText}

Respond with JSON:
{
  "sentiment": "very_negative" | "negative" | "neutral" | "positive" | "very_positive",
  "themes": ["theme1", "theme2"] // 2-4 recurring themes like: work, stress, health, relationships, money, identity, growth, family, creativity
}`,
    maxTokens: 200,
  });

  if (!result.success || !result.data) {
    return null;
  }

  return {
    overall: result.data.sentiment as any,
    themes: result.data.themes || [],
  };
}