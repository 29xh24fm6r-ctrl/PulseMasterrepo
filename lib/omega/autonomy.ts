// lib/omega/autonomy.ts
// Autonomy Management: Track and manage user autonomy levels

import { createClient } from "@supabase/supabase-js";
import { checkEarnedAutonomy } from "./confidence-ledger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type EscalationLevel = "hard_block" | "soft_block" | "observe_only" | "full_auto";
export type AutonomyLevel = 0 | 1 | 2 | 3;

export interface ConstraintCheck {
  constraintId: string;
  constraintName: string;
  escalationLevel: EscalationLevel;
  minAutonomyLevel: AutonomyLevel;
  allowsEarnedOverride: boolean;
  passed: boolean;
  action: "allow" | "block" | "confirm" | "observe";
  reason: string;
}

export interface GuardianDecision {
  canProceed: boolean;
  requiresConfirmation: boolean;
  observeOnly: boolean;
  blockedBy: string[];
  confirmationNeeded: string[];
  observing: string[];
  userAutonomyLevel: AutonomyLevel;
}

export interface UserAutonomyInfo {
  level: AutonomyLevel;
  reason: string;
  isManualOverride: boolean;
}

/**
 * Get user's current autonomy level
 */
export async function getUserAutonomyLevel(userId: string): Promise<UserAutonomyInfo> {
  try {
    // Check for existing autonomy record
    const { data: existing } = await supabase
      .from("pulse_user_autonomy")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Check for manual override
    if (existing?.manual_override !== null && existing?.manual_override !== undefined) {
      const overrideExpired =
        existing.override_expires_at && new Date(existing.override_expires_at) < new Date();

      if (!overrideExpired) {
        return {
          level: existing.manual_override as AutonomyLevel,
          reason: existing.override_reason || "Manual override",
          isManualOverride: true,
        };
      }
    }

    // Calculate earned autonomy
    const earned = await checkEarnedAutonomy(userId);

    // Update or create autonomy record
    const autonomyData = {
      user_id: userId,
      current_level: earned.level,
      level_reason: earned.reason,
      calibration_score: earned.calibrationScore,
      last_evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Add to history if level changed
      const history = existing.level_history || [];
      if (existing.current_level !== earned.level) {
        history.push({
          from: existing.current_level,
          to: earned.level,
          reason: earned.reason,
          timestamp: new Date().toISOString(),
        });
      }

      await supabase
        .from("pulse_user_autonomy")
        .update({ ...autonomyData, level_history: history })
        .eq("user_id", userId);
    } else {
      await supabase.from("pulse_user_autonomy").insert(autonomyData);
    }

    return {
      level: earned.level as AutonomyLevel,
      reason: earned.reason,
      isManualOverride: false,
    };
  } catch (err) {
    console.error("[Autonomy] Error getting user autonomy level:", err);
    return {
      level: 0,
      reason: "Error evaluating autonomy",
      isManualOverride: false,
    };
  }
}

/**
 * Check a specific action against constraints with escalation levels
 */
export async function checkConstraintsWithEscalation(
  userId: string,
  action: {
    type: string;
    domain?: string;
    confidence: number;
    isIrreversible?: boolean;
    details?: Record<string, unknown>;
  }
): Promise<GuardianDecision> {
  try {
    // Get user's autonomy level
    const { level: userLevel } = await getUserAutonomyLevel(userId);

    // Get all constraints
    const { data: constraints } = await supabase
      .from("pulse_constraints")
      .select("*")
      .order("escalation_level");

    if (!constraints) {
      return {
        canProceed: true,
        requiresConfirmation: false,
        observeOnly: false,
        blockedBy: [],
        confirmationNeeded: [],
        observing: [],
        userAutonomyLevel: userLevel,
      };
    }

    const blockedBy: string[] = [];
    const confirmationNeeded: string[] = [];
    const observing: string[] = [];

    for (const constraint of constraints) {
      // Check if constraint applies to this action
      const applies = checkConstraintApplies(constraint, action);
      if (!applies) continue;

      const escalation = constraint.escalation_level as EscalationLevel;
      const minLevel = (constraint.min_autonomy_level ?? 0) as AutonomyLevel;
      const allowsOverride = constraint.allows_earned_override ?? false;

      // Determine action based on escalation level and user autonomy
      if (escalation === "hard_block") {
        // Hard blocks never allow auto-execution
        blockedBy.push(constraint.constraint_name);
      } else if (escalation === "soft_block") {
        // Soft blocks require confirmation unless user has high autonomy
        if (userLevel >= minLevel && allowsOverride) {
          // User has earned the right to bypass this
          observing.push(constraint.constraint_name);
        } else {
          confirmationNeeded.push(constraint.constraint_name);
        }
      } else if (escalation === "observe_only") {
        // Just log, don't block
        observing.push(constraint.constraint_name);
      }
      // full_auto constraints don't restrict anything
    }

    return {
      canProceed: blockedBy.length === 0,
      requiresConfirmation: confirmationNeeded.length > 0,
      observeOnly: blockedBy.length === 0 && confirmationNeeded.length === 0 && observing.length > 0,
      blockedBy,
      confirmationNeeded,
      observing,
      userAutonomyLevel: userLevel,
    };
  } catch (err) {
    console.error("[Autonomy] Error checking constraints:", err);
    return {
      canProceed: false,
      requiresConfirmation: true,
      observeOnly: false,
      blockedBy: ["error_evaluating_constraints"],
      confirmationNeeded: [],
      observing: [],
      userAutonomyLevel: 0,
    };
  }
}

/**
 * Helper: Check if a constraint applies to an action
 */
function checkConstraintApplies(
  constraint: {
    rule?: {
      domains?: string[];
      actions?: string[];
      action_types?: string[];
      min_confidence?: number;
      requires?: string;
    };
  },
  action: {
    type: string;
    domain?: string;
    confidence: number;
    isIrreversible?: boolean;
  }
): boolean {
  const rule = constraint.rule;
  if (!rule) return false;

  // Check domain match
  if (rule.domains && action.domain) {
    if (!rule.domains.includes(action.domain)) return false;
  }

  // Check action type match
  if (rule.actions) {
    if (!rule.actions.includes(action.type)) return false;
  }

  // Check action type category match (for irreversible actions)
  if (rule.action_types && action.isIrreversible) {
    if (
      rule.action_types.includes("delete") ||
      rule.action_types.includes("terminate") ||
      rule.action_types.includes("cancel")
    ) {
      return true;
    }
  }

  // Check confidence floor
  if (rule.min_confidence) {
    if (action.confidence < rule.min_confidence) return true;
  }

  // If we have a 'requires' field, the constraint applies
  if (rule.requires) return true;

  return false;
}

/**
 * Set manual override for user autonomy
 */
export async function setAutonomyOverride(
  userId: string,
  level: AutonomyLevel,
  reason: string,
  expiresInHours?: number
): Promise<boolean> {
  try {
    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    // First check if record exists
    const { data: existing } = await supabase
      .from("pulse_user_autonomy")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("pulse_user_autonomy")
        .update({
          manual_override: level,
          override_reason: reason,
          override_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return !error;
    } else {
      const { error } = await supabase.from("pulse_user_autonomy").insert({
        user_id: userId,
        current_level: level,
        manual_override: level,
        override_reason: reason,
        override_expires_at: expiresAt,
      });

      return !error;
    }
  } catch (err) {
    console.error("[Autonomy] Error setting override:", err);
    return false;
  }
}

/**
 * Clear manual override
 */
export async function clearAutonomyOverride(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pulse_user_autonomy")
      .update({
        manual_override: null,
        override_reason: null,
        override_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return !error;
  } catch (err) {
    console.error("[Autonomy] Error clearing override:", err);
    return false;
  }
}

/**
 * Get autonomy level descriptions
 */
export async function getAutonomyLevelDescriptions(): Promise<
  {
    level: number;
    name: string;
    description: string;
    autoExecuteAllowed: boolean;
    requiresConfirmation: string[];
    exampleActions: string[];
  }[]
> {
  try {
    const { data, error } = await supabase
      .from("pulse_autonomy_levels")
      .select("*")
      .order("level");

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      level: row.level,
      name: row.name,
      description: row.description,
      autoExecuteAllowed: row.auto_execute_allowed,
      requiresConfirmation: row.requires_confirmation || [],
      exampleActions: row.example_actions || [],
    }));
  } catch {
    return [];
  }
}

/**
 * Get user's autonomy history
 */
export async function getAutonomyHistory(
  userId: string
): Promise<{ from: number; to: number; reason: string; timestamp: string }[]> {
  try {
    const { data } = await supabase
      .from("pulse_user_autonomy")
      .select("level_history")
      .eq("user_id", userId)
      .single();

    return data?.level_history || [];
  } catch {
    return [];
  }
}
