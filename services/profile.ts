// Profile Service - $5/mo + Token Packs Model
// lib/services/profile.ts

import { supabaseAdmin } from "@/lib/supabase";

// Types
export interface UserProfile {
  id?: string;
  user_id: string;
  email?: string;
  name?: string;
  
  // Subscription & Billing
  plan: "free" | "plus";
  usage_cents_this_month: number;
  usage_reset_at: string | null;
  token_balance_cents: number;
  free_month_credits: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status: string;
  trial_ends_at?: string;
  
  // Referrals
  referral_code: string;
  referred_by?: string;
  refund_eligible_at?: string;
  
  // Settings
  intensity_level: number;
  archetype?: string;
  job_title_id?: string;
  
  // Emotional state
  current_mood?: number;
  current_energy?: number;
  current_stress?: number;
  last_checkin_at?: string;
  
  // Philosophy
  philosophy_mentor?: string;
  philosophy_streak?: number;
  philosophy_last_practice?: string;
  
  // Onboarding
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  professional_identity?: any;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdateData {
  email?: string;
  name?: string;
  plan?: "free" | "plus";
  usage_cents_this_month?: number;
  token_balance_cents?: number;
  free_month_credits?: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  trial_ends_at?: string;
  referred_by?: string;
  refund_eligible_at?: string;
  intensity_level?: number;
  archetype?: string;
  job_title_id?: string;
  current_mood?: number;
  current_energy?: number;
  current_stress?: number;
  last_checkin_at?: string;
  philosophy_mentor?: string;
  philosophy_streak?: number;
  philosophy_last_practice?: string;
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  professional_identity?: any;
}

// Plan limits
export const PLAN_LIMITS = {
  free: {
    monthlyCredits: 100, // Very limited
    features: ["basic_ai", "habits", "journal", "tasks"],
    aiCallsPerDay: 10,
    voiceMinutesPerMonth: 0,
  },
  plus: {
    monthlyCredits: 300, // 300 tokens/month included
    features: ["all"], // Full access
    aiCallsPerDay: -1, // Unlimited, constrained by tokens
    voiceMinutesPerMonth: 30,
  },
};

/**
 * Get or create a user profile
 * Creates a new profile if one doesn't exist
 */
export async function getOrCreateProfile(
  userId: string,
  email?: string,
  referralCode?: string
): Promise<{ profile: UserProfile; created: boolean }> {
  // Try to get existing profile
  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existingProfile && !fetchError) {
    return { profile: existingProfile as UserProfile, created: false };
  }

  // Profile doesn't exist, create one
  const newProfile: Partial<UserProfile> = {
    user_id: userId,
    email: email || undefined,
    plan: "free",
    usage_cents_this_month: 0,
    token_balance_cents: 0,
    free_month_credits: PLAN_LIMITS.free.monthlyCredits,
    intensity_level: 2,
    subscription_status: "inactive",
  };

  // Handle referral
  if (referralCode) {
    const { data: referrer } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("referral_code", referralCode)
      .single();

    if (referrer) {
      newProfile.referred_by = referrer.user_id;
      // Give new user bonus tokens for using referral (credited when they upgrade)
    }
  }

  const { data: createdProfile, error: createError } = await supabaseAdmin
    .from("user_profiles")
    .insert(newProfile)
    .select()
    .single();

  if (createError) {
    console.error("Failed to create profile:", createError);
    throw new Error(`Failed to create profile: ${createError.message}`);
  }

  // If referred, create referral reward record (pending until upgrade)
  if (newProfile.referred_by) {
    await supabaseAdmin.from("referral_rewards").insert({
      referrer_user_id: newProfile.referred_by,
      referred_user_id: userId,
      reward_type: "signup",
      reward_cents: 500, // 500 tokens for referrer (credited when user upgrades)
      status: "pending",
    });
  }

  return { profile: createdProfile as UserProfile, created: true };
}

/**
 * Get profile by user ID
 */
export async function getProfileByUserId(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserProfile;
}

/**
 * Update profile by user ID
 */
export async function updateProfileByUserId(
  userId: string,
  updates: ProfileUpdateData
): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update profile:", error);
    return null;
  }

  return data as UserProfile;
}

/**
 * Update profile by ID (UUID)
 */
export async function updateProfileById(
  id: string,
  updates: ProfileUpdateData
): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update profile:", error);
    return null;
  }

  return data as UserProfile;
}

/**
 * Track usage and update monthly usage
 * Returns whether the usage is allowed and remaining tokens
 */
export async function trackUsage(
  userId: string,
  feature: string,
  costCents: number,
  tokensUsed?: number,
  model?: string,
  metadata?: any
): Promise<{ allowed: boolean; remainingTokens: number; profile: UserProfile }> {
  // Get current profile
  const { profile } = await getOrCreateProfile(userId);

  // Check if we need to reset monthly usage
  const now = new Date();
  const resetAt = profile.usage_reset_at ? new Date(profile.usage_reset_at) : null;
  const needsReset = !resetAt || resetAt < new Date(now.getFullYear(), now.getMonth(), 1);

  if (needsReset) {
    // Reset monthly usage
    await updateProfileByUserId(userId, {
      usage_cents_this_month: 0,
    });
    profile.usage_cents_this_month = 0;
  }

  // Calculate available tokens
  const planLimits = PLAN_LIMITS[profile.plan];
  const monthlyAllowance = planLimits.monthlyCredits;
  const purchasedTokens = profile.token_balance_cents;
  const usedThisMonth = profile.usage_cents_this_month;
  
  // First use monthly allowance, then purchased tokens
  const monthlyRemaining = Math.max(0, monthlyAllowance - usedThisMonth);
  const totalAvailable = monthlyRemaining + purchasedTokens;

  // Check if usage is allowed
  const allowed = costCents <= totalAvailable;

  if (allowed) {
    // Log the usage
    await supabaseAdmin.from("usage_logs").insert({
      user_id: userId,
      feature,
      tokens_used: tokensUsed || costCents,
      cost_cents: costCents,
      model,
      metadata,
    });

    // Deduct from monthly allowance first, then from purchased tokens
    let newMonthlyUsage = usedThisMonth;
    let newTokenBalance = purchasedTokens;

    if (monthlyRemaining >= costCents) {
      // All from monthly allowance
      newMonthlyUsage = usedThisMonth + costCents;
    } else {
      // Use remaining monthly, then purchased
      const fromPurchased = costCents - monthlyRemaining;
      newMonthlyUsage = monthlyAllowance; // Max out monthly
      newTokenBalance = purchasedTokens - fromPurchased;
    }

    await updateProfileByUserId(userId, {
      usage_cents_this_month: newMonthlyUsage,
      token_balance_cents: Math.max(0, newTokenBalance),
    });

    profile.usage_cents_this_month = newMonthlyUsage;
    profile.token_balance_cents = Math.max(0, newTokenBalance);
  }

  const remainingTokens = Math.max(0, totalAvailable - (allowed ? costCents : 0));

  return {
    allowed,
    remainingTokens,
    profile,
  };
}

/**
 * Add tokens to user's balance
 */
export async function addTokens(
  userId: string,
  tokens: number,
  reason: string
): Promise<UserProfile | null> {
  const { profile } = await getOrCreateProfile(userId);

  const newBalance = profile.token_balance_cents + tokens;

  return updateProfileByUserId(userId, {
    token_balance_cents: newBalance,
  });
}

/**
 * Upgrade user to Plus plan
 */
export async function upgradeToPlusPlan(
  userId: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<UserProfile | null> {
  const now = new Date();
  
  // Calculate refund eligibility (7 days from upgrade)
  const refundEligibleAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return updateProfileByUserId(userId, {
    plan: "plus",
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    subscription_status: "active",
    refund_eligible_at: refundEligibleAt.toISOString(),
  });
}

/**
 * Downgrade user to free plan
 */
export async function downgradeToFreePlan(userId: string): Promise<UserProfile | null> {
  return updateProfileByUserId(userId, {
    plan: "free",
    stripe_subscription_id: undefined,
    subscription_status: "cancelled",
  });
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string): Promise<{
  referralCode: string;
  totalReferred: number;
  pendingRewards: number;
  creditedRewards: number;
}> {
  const { profile } = await getOrCreateProfile(userId);

  const { data: rewards } = await supabaseAdmin
    .from("referral_rewards")
    .select("*")
    .eq("referrer_user_id", userId);

  const pendingRewards = (rewards || [])
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.reward_cents, 0);

  const creditedRewards = (rewards || [])
    .filter((r) => r.status === "credited")
    .reduce((sum, r) => sum + r.reward_cents, 0);

  return {
    referralCode: profile.referral_code,
    totalReferred: rewards?.length || 0,
    pendingRewards,
    creditedRewards,
  };
}

/**
 * Check if user has access to a feature
 */
export function hasFeatureAccess(profile: UserProfile, feature: string): boolean {
  const planLimits = PLAN_LIMITS[profile.plan];
  
  if (planLimits.features.includes("all")) {
    return true;
  }
  
  return planLimits.features.includes(feature);
}

/**
 * Get usage summary for a user
 */
export async function getUsageSummary(userId: string): Promise<{
  plan: string;
  usedCents: number;
  limitCents: number;
  remainingCents: number;
  percentUsed: number;
  purchasedTokens: number;
  totalAvailable: number;
  features: string[];
}> {
  const { profile } = await getOrCreateProfile(userId);
  const planLimits = PLAN_LIMITS[profile.plan];
  
  const limitCents = planLimits.monthlyCredits;
  const usedCents = profile.usage_cents_this_month;
  const remainingCents = Math.max(0, limitCents - usedCents);
  const percentUsed = limitCents > 0 ? Math.round((usedCents / limitCents) * 100) : 0;
  const purchasedTokens = profile.token_balance_cents;
  const totalAvailable = remainingCents + purchasedTokens;

  return {
    plan: profile.plan,
    usedCents,
    limitCents,
    remainingCents,
    percentUsed,
    purchasedTokens,
    totalAvailable,
    features: planLimits.features,
  };
}

/**
 * Check if user has enough tokens for an operation
 */
export async function hasEnoughTokens(userId: string, requiredTokens: number): Promise<{
  hasEnough: boolean;
  available: number;
  shortfall: number;
}> {
  const { profile } = await getOrCreateProfile(userId);
  const planLimits = PLAN_LIMITS[profile.plan];
  
  const monthlyRemaining = Math.max(0, planLimits.monthlyCredits - profile.usage_cents_this_month);
  const available = monthlyRemaining + profile.token_balance_cents;
  const hasEnough = available >= requiredTokens;
  const shortfall = hasEnough ? 0 : requiredTokens - available;

  return { hasEnough, available, shortfall };
}