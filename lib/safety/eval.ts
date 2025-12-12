// Safety Evaluation Logic
// lib/safety/eval.ts

import { SafetyPolicyConfig, SafetyRule, SafetyEvaluation } from "./types";

/**
 * Evaluate text against safety policy
 */
export function evaluateTextAgainstPolicy(
  text: string,
  policy: SafetyPolicyConfig,
  direction: "input" | "output"
): SafetyEvaluation {
  const triggeredRules: SafetyRule[] = [];
  let highestSeverity = 0;
  let action: SafetyAction | undefined;

  const lowerText = text.toLowerCase();

  for (const rule of policy.hard_rules) {
    const triggers = rule.triggers;
    const patterns = direction === "input" ? triggers.input_patterns : triggers.output_patterns;

    if (!patterns || patterns.length === 0) continue;

    // Check if any pattern matches
    const matches = patterns.some((pattern) => {
      // Simple substring match (can be enhanced with regex)
      return lowerText.includes(pattern.toLowerCase());
    });

    if (matches) {
      triggeredRules.push(rule);
      if (rule.severity > highestSeverity) {
        highestSeverity = rule.severity;
        action = rule.action;
      }
    }
  }

  return {
    triggeredRules,
    highestSeverity,
    action,
  };
}

/**
 * Check if text should be blocked
 */
export function shouldBlock(evaluation: SafetyEvaluation): boolean {
  return evaluation.action === "block" && evaluation.highestSeverity >= 4;
}

/**
 * Check if text should be sanitized
 */
export function shouldSanitize(evaluation: SafetyEvaluation): boolean {
  return evaluation.action === "sanitize" && evaluation.highestSeverity >= 2;
}

/**
 * Check if text should route to help
 */
export function shouldRouteToHelp(evaluation: SafetyEvaluation): boolean {
  return evaluation.action === "route_to_help";
}




