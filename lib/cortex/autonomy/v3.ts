// Autonomy Engine v3 - Enhanced Policy System
// lib/cortex/autonomy/v3.ts

import { DomainKey, PulseCortexContext } from "../types";

export interface AutonomyPolicy {
  id: string;
  domain: DomainKey | "global";
  name: string;
  description?: string;
  evaluate: (ctx: PulseCortexContext) => AutonomyAction[];
  priority?: number;
  isEnabled?: boolean;
}

export interface AutonomyAction {
  id: string;
  domain: DomainKey | "global";
  title: string;
  description?: string;
  payload: Record<string, any>;
  severity: "info" | "warning" | "urgent";
  requiresConfirmation?: boolean;
  metadata?: Record<string, any>;
}

// Policy registry
const policies: AutonomyPolicy[] = [];

/**
 * Register an autonomy policy
 */
export function registerPolicy(policy: AutonomyPolicy) {
  const index = policies.findIndex((p) => p.id === policy.id);
  if (index >= 0) {
    policies[index] = { ...policy, isEnabled: policy.isEnabled !== false };
  } else {
    policies.push({ ...policy, isEnabled: policy.isEnabled !== false });
  }

  // Sort by priority (higher first)
  policies.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Run autonomy evaluation across all policies
 */
export function runAutonomy(ctx: PulseCortexContext): AutonomyAction[] {
  const actions: AutonomyAction[] = [];

  for (const policy of policies) {
    if (policy.isEnabled === false) continue;

    try {
      const policyActions = policy.evaluate(ctx);
      actions.push(...policyActions);
    } catch (err) {
      console.error(`[Autonomy v3] Policy ${policy.id} evaluation failed:`, err);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.domain}:${action.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Get actions for specific domain
 */
export function getDomainActions(
  ctx: PulseCortexContext,
  domain: DomainKey
): AutonomyAction[] {
  const allActions = runAutonomy(ctx);
  return allActions.filter(
    (action) => action.domain === domain || action.domain === "global"
  );
}

/**
 * Get high-severity actions
 */
export function getHighSeverityActions(ctx: PulseCortexContext): AutonomyAction[] {
  const allActions = runAutonomy(ctx);
  return allActions.filter((action) => action.severity === "urgent");
}



