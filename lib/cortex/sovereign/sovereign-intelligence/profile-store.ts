// Behavior Profile Store
// lib/cortex/sovereign/sovereign-intelligence/profile-store.ts

import { supabaseAdmin } from "@/lib/supabase";
import { BehaviorProfile } from "./types";

/**
 * Get behavior profile for user (create default if doesn't exist)
 */
export async function getBehaviorProfile(userId: string): Promise<BehaviorProfile> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Try to fetch existing profile
  const { data: profile } = await supabaseAdmin
    .from("sovereign_behavior_profiles")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (profile) {
    return {
      id: profile.id,
      userId: dbUserId,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      pushIntensity: profile.push_intensity,
      autonomyLevel: profile.autonomy_level,
      guidanceStyle: profile.guidance_style,
      planningGranularity: profile.planning_granularity,
      domainWeights: profile.domain_weights || {},
      riskTolerance: parseFloat(profile.risk_tolerance) || 0.5,
      changeSpeed: parseFloat(profile.change_speed) || 0.5,
      version: profile.version || 1,
      lastUpdateReason: profile.last_update_reason,
    };
  }

  // Create default profile
  const defaultProfile: Omit<BehaviorProfile, "id" | "createdAt" | "updatedAt"> = {
    userId: dbUserId,
    pushIntensity: "balanced",
    autonomyLevel: "medium",
    guidanceStyle: "advisory",
    planningGranularity: "balanced",
    domainWeights: {
      work: 0.2,
      relationships: 0.2,
      finance: 0.2,
      life: 0.2,
      strategy: 0.2,
    },
    riskTolerance: 0.5,
    changeSpeed: 0.5,
    version: 1,
  };

  const { data: newProfile, error } = await supabaseAdmin
    .from("sovereign_behavior_profiles")
    .insert({
      user_id: dbUserId,
      push_intensity: defaultProfile.pushIntensity,
      autonomy_level: defaultProfile.autonomyLevel,
      guidance_style: defaultProfile.guidanceStyle,
      planning_granularity: defaultProfile.planningGranularity,
      domain_weights: defaultProfile.domainWeights,
      risk_tolerance: defaultProfile.riskTolerance,
      change_speed: defaultProfile.changeSpeed,
      version: defaultProfile.version,
    })
    .select()
    .single();

  if (error || !newProfile) {
    throw new Error(`Failed to create behavior profile: ${error?.message}`);
  }

  return {
    id: newProfile.id,
    userId: dbUserId,
    createdAt: newProfile.created_at,
    updatedAt: newProfile.updated_at,
    ...defaultProfile,
  };
}

/**
 * Update behavior profile
 */
export async function updateBehaviorProfile(
  userId: string,
  updates: Partial<BehaviorProfile>
): Promise<void> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.pushIntensity) updateData.push_intensity = updates.pushIntensity;
  if (updates.autonomyLevel) updateData.autonomy_level = updates.autonomyLevel;
  if (updates.guidanceStyle) updateData.guidance_style = updates.guidanceStyle;
  if (updates.planningGranularity) updateData.planning_granularity = updates.planningGranularity;
  if (updates.domainWeights) updateData.domain_weights = updates.domainWeights;
  if (updates.riskTolerance !== undefined) updateData.risk_tolerance = updates.riskTolerance;
  if (updates.changeSpeed !== undefined) updateData.change_speed = updates.changeSpeed;
  if (updates.lastUpdateReason) updateData.last_update_reason = updates.lastUpdateReason;
  if (updates.version !== undefined) updateData.version = updates.version;

  const { error } = await supabaseAdmin
    .from("sovereign_behavior_profiles")
    .update(updateData)
    .eq("user_id", dbUserId);

  if (error) {
    throw new Error(`Failed to update behavior profile: ${error.message}`);
  }
}



