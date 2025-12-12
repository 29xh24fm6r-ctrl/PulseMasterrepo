// Autopilot Policy Management
// lib/autopilot/policy.ts

import { supabaseAdmin } from "@/lib/supabase";
import { AutopilotPolicy } from "./types";

/**
 * Get or create default autopilot policy for user
 */
export async function getAutopilotPolicy(
  userId: string
): Promise<AutopilotPolicy> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data: policy } = await supabaseAdmin
    .from("autopilot_policies")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (policy) {
    return policy as AutopilotPolicy;
  }

  // Create default policy
  const { data: newPolicy } = await supabaseAdmin
    .from("autopilot_policies")
    .insert({
      user_id: dbUserId,
      mode: "shadow",
      enabled_action_types: [],
      daily_action_limit: 10,
      max_risk_level: "medium",
    })
    .select("*")
    .single();

  return newPolicy as AutopilotPolicy;
}

/**
 * Update autopilot policy
 */
export async function updateAutopilotPolicy(
  userId: string,
  updates: Partial<AutopilotPolicy>
): Promise<AutopilotPolicy> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data: policy } = await supabaseAdmin
    .from("autopilot_policies")
    .upsert(
      {
        user_id: dbUserId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    )
    .select("*")
    .single();

  return policy as AutopilotPolicy;
}

/**
 * Check if action is allowed by policy
 */
export function isActionAllowed(
  policy: AutopilotPolicy,
  actionType: string,
  riskLevel: string,
  currentHour: number
): boolean {
  // Check mode
  if (policy.mode === "off") {
    return false;
  }

  // Check action type
  if (
    policy.enabled_action_types.length > 0 &&
    !policy.enabled_action_types.includes(actionType as any)
  ) {
    return false;
  }

  // Check risk level
  const riskOrder = { low: 1, medium: 2, high: 3 };
  const maxRisk = riskOrder[policy.max_risk_level as keyof typeof riskOrder] || 2;
  const actionRisk = riskOrder[riskLevel as keyof typeof riskOrder] || 2;
  if (actionRisk > maxRisk) {
    return false;
  }

  // Check quiet hours
  if (policy.quiet_hours_start && policy.quiet_hours_end) {
    const startHour = parseInt(policy.quiet_hours_start.split(":")[0]);
    const endHour = parseInt(policy.quiet_hours_end.split(":")[0]);
    if (startHour > endHour) {
      // Overnight quiet hours
      if (currentHour >= startHour || currentHour < endHour) {
        return false;
      }
    } else {
      // Same-day quiet hours
      if (currentHour >= startHour && currentHour < endHour) {
        return false;
      }
    }
  }

  return true;
}




