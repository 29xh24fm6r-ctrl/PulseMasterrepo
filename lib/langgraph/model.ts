// lib/langgraph/model.ts
// Standardized model factory for Omega LangGraph nodes

import { ChatOpenAI } from "@langchain/openai";

export interface OmegaModelOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Create a standardized ChatOpenAI instance for Omega nodes.
 * Uses `model` property (not `modelName`) for LCJS compatibility.
 */
export function omegaModel(opts?: OmegaModelOptions): ChatOpenAI {
  return new ChatOpenAI({
    model: process.env.PULSE_OMEGA_MODEL ?? "gpt-4o-mini",
    temperature: opts?.temperature ?? 0.3,
    maxTokens: opts?.maxTokens,
  });
}

/**
 * Create a model optimized for JSON output (lower temperature)
 */
export function omegaJsonModel(): ChatOpenAI {
  return new ChatOpenAI({
    model: process.env.PULSE_OMEGA_MODEL ?? "gpt-4o-mini",
    temperature: 0.1,
  });
}

/**
 * Create a model for creative tasks (higher temperature)
 */
export function omegaCreativeModel(): ChatOpenAI {
  return new ChatOpenAI({
    model: process.env.PULSE_OMEGA_MODEL ?? "gpt-4o-mini",
    temperature: 0.7,
  });
}
