// lib/omega/llm.ts
// LLM utilities for Omega Prime

import { llmJson } from "@/lib/llm/client";

interface OmegaLLMOptions {
  model?: string;
  maxRetries?: number;
}

/**
 * Execute an Omega prompt with variable substitution
 */
export async function executeOmegaPrompt<T>(
  promptTemplate: string,
  variables: Record<string, unknown>,
  options: OmegaLLMOptions = {}
): Promise<T> {
  const { model = "gpt-4o", maxRetries = 2 } = options;

  // Substitute variables in prompt
  let prompt = promptTemplate;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const stringValue = typeof value === 'object'
      ? JSON.stringify(value, null, 2)
      : String(value);
    prompt = prompt.replace(new RegExp(placeholder, 'g'), stringValue);
  }

  const result = await llmJson({
    prompt,
    model,
    maxRetries,
  });

  return result as T;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
