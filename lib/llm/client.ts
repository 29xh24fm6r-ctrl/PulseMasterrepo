// LLM Abstraction Layer
// lib/llm/client.ts
import { getOpenAI } from "@/services/ai/openai";

interface LLMOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface LLMJsonParams {
  prompt: string;
  schema?: any;
  model?: string;
  maxRetries?: number;
}

// Main JSON completion function (matches spec)
export async function llmJson(params: LLMJsonParams): Promise<any> {
  const { prompt, schema, model = "gpt-4o-mini", maxRetries = 2 } = params;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const systemPrompt = schema
        ? `You are a helpful assistant that responds only in valid JSON matching this schema: ${JSON.stringify(schema)}. No markdown, no explanation, just valid JSON.`
        : `You are a helpful assistant that responds only in valid JSON. No markdown, no explanation, just valid JSON.`;

      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "{}";

      // Clean and parse JSON
      let cleaned = content.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      return JSON.parse(cleaned);
    } catch (error) {
      lastError = error as Error;
      console.warn(`LLM JSON attempt ${attempt + 1} failed:`, error);

      // If JSON parse error, try auto-correction on next attempt
      if (attempt < maxRetries && error instanceof SyntaxError) {
        continue;
      }
    }
  }

  throw lastError || new Error("LLM JSON failed after retries");
}

// Simple completion (returns string)
export async function llmComplete(
  prompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const { model = "gpt-4o-mini", temperature = 0.7, max_tokens = 1000 } = options;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens,
  });

  return response.choices[0]?.message?.content || "";
}

// Typed JSON completion with generics
export async function llmTypedJson<T>(
  prompt: string,
  options: LLMOptions = {}
): Promise<T> {
  return llmJson({ prompt, model: options.model }) as Promise<T>;
}

// Legacy exports for backward compatibility
export const LLM = {
  complete: llmComplete,
  completeJSON: llmJson,
  completeSimple: llmComplete,
  json: llmJson,
};

export default LLM;