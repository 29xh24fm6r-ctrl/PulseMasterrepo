// Safety Engine - Pre/Post Checks
// lib/safety/engine.ts

import { getSafetyPolicy } from "./seed";
import { evaluateTextAgainstPolicy, shouldBlock, shouldSanitize, shouldRouteToHelp } from "./eval";
import { logSafetyIncident } from "./logger";
import { SafetyEvaluation, SafetyAction } from "./types";
import { llmComplete } from "@/lib/llm/client";

export interface SafetyPreCheckParams {
  userId?: string;
  coachId: string;
  personaId?: string;
  userInput: string;
}

export interface SafetyPreCheckResult {
  allowed: boolean;
  eval: SafetyEvaluation;
  action?: SafetyAction;
  boundaryMessage?: string;
}

export interface SafetyPostCheckParams {
  userId?: string;
  coachId: string;
  personaId?: string;
  userInput: string;
  modelOutput: string;
}

export interface SafetyPostCheckResult {
  finalText: string;
  incidentLogged: boolean;
}

/**
 * Run safety pre-check on user input
 */
export async function runSafetyPreCheck(
  params: SafetyPreCheckParams
): Promise<SafetyPreCheckResult> {
  // Ensure policies are seeded
  await seedSafetyPolicies();
  
  // Load global default policy
  const policy = await getSafetyPolicy("global_default");
  if (!policy) {
    // If no policy, allow but log warning
    console.warn("[SafetyEngine] No safety policy found, allowing request");
    return {
      allowed: true,
      eval: { triggeredRules: [], highestSeverity: 0 },
    };
  }

  // Evaluate user input
  const evaluation = evaluateTextAgainstPolicy(params.userInput, policy, "input");

  // Check if should block
  if (shouldBlock(evaluation)) {
    const boundaryMessage = buildBlockedResponse(evaluation, "input");
    
    // Log incident
    await logSafetyIncident({
      userId: params.userId,
      coachId: params.coachId,
      personaId: params.personaId,
      policyKey: policy.key,
      category: evaluation.triggeredRules[0]?.category || "other",
      action: "block",
      severity: evaluation.highestSeverity,
      userInput: params.userInput,
      modelOutput: "",
      incidentType: "blocked_output",
    });

    return {
      allowed: false,
      eval: evaluation,
      action: "block",
      boundaryMessage,
    };
  }

  // Check if should route to help (self-harm/suicide)
  if (shouldRouteToHelp(evaluation)) {
    const boundaryMessage = buildHelpResponse(evaluation);
    
    // Log incident
    await logSafetyIncident({
      userId: params.userId,
      coachId: params.coachId,
      personaId: params.personaId,
      policyKey: policy.key,
      category: evaluation.triggeredRules[0]?.category || "self_harm",
      action: "route_to_help",
      severity: evaluation.highestSeverity,
      userInput: params.userInput,
      modelOutput: "",
      incidentType: "escalation",
    });

    return {
      allowed: true, // Allow but with special handling
      eval: evaluation,
      action: "route_to_help",
      boundaryMessage,
    };
  }

  return {
    allowed: true,
    eval: evaluation,
  };
}

/**
 * Run safety post-check on model output
 */
export async function runSafetyPostCheck(
  params: SafetyPostCheckParams
): Promise<SafetyPostCheckResult> {
  // Ensure policies are seeded
  await seedSafetyPolicies();
  
  // Load global default policy
  const policy = await getSafetyPolicy("global_default");
  if (!policy) {
    return {
      finalText: params.modelOutput,
      incidentLogged: false,
    };
  }

  // Evaluate model output
  const evaluation = evaluateTextAgainstPolicy(params.modelOutput, policy, "output");

  let finalText = params.modelOutput;
  let incidentLogged = false;

  // Check if should block
  if (shouldBlock(evaluation)) {
    finalText = buildBlockedResponse(evaluation, "output");
    incidentLogged = true;

    await logSafetyIncident({
      userId: params.userId,
      coachId: params.coachId,
      personaId: params.personaId,
      policyKey: policy.key,
      category: evaluation.triggeredRules[0]?.category || "other",
      action: "block",
      severity: evaluation.highestSeverity,
      userInput: params.userInput,
      modelOutput: params.modelOutput,
      incidentType: "blocked_output",
    });
  }
  // Check if should sanitize
  else if (shouldSanitize(evaluation)) {
    finalText = await sanitizeOutput(params.modelOutput, evaluation, policy);
    incidentLogged = true;

    await logSafetyIncident({
      userId: params.userId,
      coachId: params.coachId,
      personaId: params.personaId,
      policyKey: policy.key,
      category: evaluation.triggeredRules[0]?.category || "other",
      action: "sanitize",
      severity: evaluation.highestSeverity,
      userInput: params.userInput,
      modelOutput: params.modelOutput,
      incidentType: "sanitized_output",
      metadata: { sanitized_text: finalText },
    });
  }

  return {
    finalText,
    incidentLogged,
  };
}

/**
 * Build blocked response message
 */
function buildBlockedResponse(evaluation: SafetyEvaluation, direction: "input" | "output"): string {
  const category = evaluation.triggeredRules[0]?.category || "other";
  
  if (category === "sexual") {
    return "I can't engage with sexual content. I'm here to help you with coaching, support, and guidance in appropriate ways. How else can I assist you?";
  }
  
  if (category === "violence" || category === "illegal_acts") {
    return "I can't help with violence, illegal activities, or harmful actions. I'm here to support you in positive, constructive ways. What else can I help with?";
  }
  
  if (category === "hate_harassment") {
    return "I can't engage with hate speech or harassment. I'm committed to respectful, inclusive communication. How can I help you in a positive way?";
  }

  return "I can't help with that request. I'm here to support you in safe, constructive ways. What else can I assist you with?";
}

/**
 * Build help response for self-harm/suicide
 */
function buildHelpResponse(evaluation: SafetyEvaluation): string {
  return `I'm concerned about what you're sharing. Your safety is important.

If you're in immediate danger, please call 988 (Suicide & Crisis Lifeline) or 911.

I'm here to listen and support you, but I'm not a replacement for professional help. Consider reaching out to:
- A mental health professional
- A trusted friend or family member
- A crisis hotline (988)

How can I support you right now in a safe way?`;
}

/**
 * Sanitize output using LLM
 */
async function sanitizeOutput(
  originalText: string,
  evaluation: SafetyEvaluation,
  policy: any
): Promise<string> {
  const category = evaluation.triggeredRules[0]?.category || "other";
  const rule = evaluation.triggeredRules[0];

  let sanitizationPrompt = `Rewrite the following response to comply with safety policy. Remove or soften any content related to ${category}. `;

  if (category === "medical_diagnosis") {
    sanitizationPrompt += `Do not provide diagnoses or prescriptions. Instead, provide general educational information and encourage consulting a healthcare professional. `;
  }

  if (category === "financial_advice_high_risk") {
    sanitizationPrompt += `Do not provide specific investment advice. Instead, provide general educational information and encourage consulting a financial professional. `;
  }

  if (category === "substances") {
    sanitizationPrompt += `Do not provide instructions on substance use. Instead, provide harm-reduction information or support for quitting. `;
  }

  sanitizationPrompt += `Keep the helpful, supportive tone but ensure compliance with safety boundaries.\n\nOriginal response:\n${originalText}`;

  try {
    const sanitized = await llmComplete(sanitizationPrompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: Math.ceil(originalText.length * 1.2),
    });

    return sanitized || originalText; // Fallback to original if sanitization fails
  } catch (err) {
    console.error("[SafetyEngine] Sanitization failed:", err);
    return originalText; // Fallback to original
  }
}

