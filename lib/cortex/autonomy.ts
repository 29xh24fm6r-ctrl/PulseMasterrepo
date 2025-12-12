// Autonomy Core - Policy-Based Action Generation
// lib/cortex/autonomy.ts

import { DomainKey, PulseCortexContext } from "./types";

export type AutonomyDomain = DomainKey | "global";

export interface AutonomyTrigger {
  type:
    | "time_interval"
    | "pattern_detected"
    | "emotion_change"
    | "streak_break"
    | "event_ingested";
  domain: AutonomyDomain;
  metadata?: Record<string, any>;
}

export interface AutonomyAction {
  id: string;
  domain: AutonomyDomain;
  title: string;
  description?: string;
  riskLevel: "low" | "medium" | "high";
  requiresConfirmation: boolean;
  // This can map to tasks, emails, nudges, etc.
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AutonomyPolicy {
  id: string;
  domain: AutonomyDomain;
  name: string;
  description?: string;
  isEnabled: boolean;
  evaluate: (ctx: PulseCortexContext) => AutonomyAction[];
  priority?: number; // Higher priority policies evaluated first
}

// Policy registry
const policies: AutonomyPolicy[] = [];

/**
 * Register an autonomy policy
 */
export function registerAutonomyPolicy(policy: AutonomyPolicy) {
  // Remove existing policy with same ID if present
  const index = policies.findIndex((p) => p.id === policy.id);
  if (index >= 0) {
    policies[index] = policy;
  } else {
    policies.push(policy);
  }

  // Sort by priority (higher first)
  policies.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Evaluate all enabled policies and return actions
 */
export function evaluateAutonomy(ctx: PulseCortexContext): AutonomyAction[] {
  const actions: AutonomyAction[] = [];

  for (const policy of policies) {
    if (!policy.isEnabled) continue;

    try {
      const policyActions = policy.evaluate(ctx);
      actions.push(...policyActions);
    } catch (err) {
      console.error(`[Autonomy] Policy ${policy.id} evaluation failed:`, err);
    }
  }

  // Deduplicate actions (by title + domain)
  const seen = new Set<string>();
  const deduplicated = actions.filter((action) => {
    const key = `${action.domain}:${action.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Apply safety guardrails
  return applySafetyGuards(deduplicated, ctx);
}

/**
 * Get actions for a specific domain
 */
export function getDomainActions(
  ctx: PulseCortexContext,
  domain: DomainKey
): AutonomyAction[] {
  const allActions = evaluateAutonomy(ctx);
  return allActions.filter(
    (action) => action.domain === domain || action.domain === "global"
  );
}

/**
 * Get high-risk actions that require confirmation
 */
export function getHighRiskActions(ctx: PulseCortexContext): AutonomyAction[] {
  const allActions = evaluateAutonomy(ctx);
  return allActions.filter(
    (action) => action.riskLevel === "high" || action.requiresConfirmation
  );
}

/**
 * Safety guardrails: Filter actions based on emotional state and risk
 */
export function applySafetyGuards(
  actions: AutonomyAction[],
  ctx: PulseCortexContext
): AutonomyAction[] {
  const filtered: AutonomyAction[] = [];

  for (const action of actions) {
    // Guard 1: High-risk actions in relationships/finance always require confirmation
    if (
      (action.domain === "relationships" || action.domain === "finance") &&
      action.riskLevel === "high" &&
      !action.requiresConfirmation
    ) {
      // Force confirmation requirement
      action.requiresConfirmation = true;
    }

    // Guard 2: Block high-risk actions when user is severely stressed
    if (
      ctx.emotion &&
      (ctx.emotion.detected_emotion === "stressed" ||
        ctx.emotion.detected_emotion === "overwhelmed") &&
      ctx.emotion.intensity > 0.8 &&
      action.riskLevel === "high"
    ) {
      // Skip high-risk actions when user is overwhelmed
      continue;
    }

    // Guard 3: Block financial actions when emotion is negative and intense
    if (
      action.domain === "finance" &&
      ctx.emotion &&
      (ctx.emotion.detected_emotion === "sad" ||
        ctx.emotion.detected_emotion === "anxious" ||
        ctx.emotion.detected_emotion === "fearful") &&
      ctx.emotion.intensity > 0.7 &&
      action.riskLevel !== "low"
    ) {
      // Skip non-low-risk financial actions when emotionally vulnerable
      continue;
    }

    // Guard 4: Block relationship repair actions when user is low energy
    if (
      action.domain === "relationships" &&
      action.payload.type === "relationship_repair" &&
      ctx.cognitiveProfile.currentEnergyLevel < 0.4
    ) {
      // Skip relationship repairs when energy is too low
      continue;
    }

    filtered.push(action);
  }

  return filtered;
}

