// Usage Tracking Service with Token Enforcement
// lib/services/usage.ts

import { checkUsageAlerts } from "@/services/alerts";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

// Cost per 1K tokens in cents (approximate OpenAI pricing)
const AI_COSTS = {
  "gpt-4o": { inputPer1k: 0.25, outputPer1k: 1.0 },
  "gpt-4o-mini": { inputPer1k: 0.015, outputPer1k: 0.06 },
  "gpt-4-turbo": { inputPer1k: 1.0, outputPer1k: 3.0 },
  "gpt-3.5-turbo": { inputPer1k: 0.05, outputPer1k: 0.15 },
  "whisper-1": { perMinute: 0.6 },
  "tts-1": { per1kChars: 1.5 },
  "tts-1-hd": { per1kChars: 3.0 },
} as const;

// Plan limits
const PLAN_LIMITS = {
  free: {
    monthlyTokens: 100,
    dailyAICalls: 10,
    features: ["basic_ai", "habits", "journal", "tasks"],
  },
  plus: {
    monthlyTokens: 300, // $3 cost cap
    dailyAICalls: -1, // Unlimited (constrained by tokens)
    features: ["all"],
  },
};

export interface UsageCheck {
  allowed: boolean;
  reason?: string;
  remainingTokens: number;
  requiresUpgrade: boolean;
}

export interface UsageResult {
  success: boolean;
  tokensUsed: number;
  remainingTokens: number;
}

/**
 * Calculate cost in cents for a chat completion
 */
export function calculateChatCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = AI_COSTS[model as keyof typeof AI_COSTS] || AI_COSTS["gpt-4o-mini"];
  if ("inputPer1k" in costs) {
    const inputCost = (inputTokens / 1000) * costs.inputPer1k;
    const outputCost = (outputTokens / 1000) * costs.outputPer1k;
    return Math.ceil(inputCost + outputCost);
  }
  return 1; // Default 1 cent for unknown models
}

/**
 * Calculate cost for transcription
 */
export function calculateTranscriptionCost(durationMinutes: number): number {
  return Math.ceil(durationMinutes * AI_COSTS["whisper-1"].perMinute);
}

/**
 * Calculate cost for text-to-speech
 */
export function calculateTTSCost(characters: number, hd: boolean = false): number {
  const rate = hd ? AI_COSTS["tts-1-hd"].per1kChars : AI_COSTS["tts-1"].per1kChars;
  return Math.ceil((characters / 1000) * rate);
}

/**
 * Check if user can make an AI call (pre-check before calling AI)
 */
export async function canMakeAICall(
  userId: string,
  feature: string = "ai",
  estimatedCostCents: number = 1
): Promise<UsageCheck> {
  try {
    const { data: profile, error } = await getSupabaseAdminRuntimeClient()
      .from("user_profiles")
      .select("plan, usage_cents_this_month, token_balance_cents")
      .eq("user_id_uuid", userId)
      .single();

    if (error || !profile) {
      return {
        allowed: false,
        reason: "Profile not found",
        remainingTokens: 0,
        requiresUpgrade: false,
      };
    }

    const plan = profile.plan || "free";
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

    // Check feature access
    if (limits.features[0] !== "all" && !limits.features.includes(feature)) {
      return {
        allowed: false,
        reason: `${feature} requires Pulse+ subscription`,
        remainingTokens: 0,
        requiresUpgrade: true,
      };
    }

    // Calculate available tokens
    const usedThisMonth = profile.usage_cents_this_month || 0;
    const monthlyRemaining = Math.max(0, limits.monthlyTokens - usedThisMonth);
    const purchasedTokens = profile.token_balance_cents || 0;
    const totalAvailable = monthlyRemaining + purchasedTokens;

    if (totalAvailable < estimatedCostCents) {
      return {
        allowed: false,
        reason: plan === "free"
          ? "Free tier limit reached. Upgrade to Pulse+ for more tokens."
          : "Token balance depleted. Purchase more tokens to continue.",
        remainingTokens: totalAvailable,
        requiresUpgrade: plan === "free",
      };
    }

    // Check daily rate limit for free users
    if (plan === "free" && limits.dailyAICalls > 0) {
      const dailyCount = await getDailyAICallCount(userId);
      if (dailyCount >= limits.dailyAICalls) {
        return {
          allowed: false,
          reason: `Daily limit of ${limits.dailyAICalls} AI calls reached. Upgrade to Pulse+ for unlimited.`,
          remainingTokens: totalAvailable,
          requiresUpgrade: true,
        };
      }
    }

    return {
      allowed: true,
      remainingTokens: totalAvailable - estimatedCostCents,
      requiresUpgrade: false,
    };
  } catch (err) {
    console.error("Usage check error:", err);
    return {
      allowed: false,
      reason: "Usage check failed",
      remainingTokens: 0,
      requiresUpgrade: false,
    };
  }
}

/**
 * Track AI usage and deduct tokens (call after AI operation)
 */
export async function trackAIUsage(
  userId: string,
  feature: string,
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
  metadata?: Record<string, unknown>
): Promise<UsageResult> {
  try {
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;
    const costCents = calculateChatCost(model, inputTokens, outputTokens);

    // Get current profile
    const { data: profile, error: profileError } = await getSupabaseAdminRuntimeClient()
      .from("user_profiles")
      .select("plan, usage_cents_this_month, token_balance_cents")
      .eq("user_id_uuid", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found for usage tracking:", userId);
      return { success: false, tokensUsed: 0, remainingTokens: 0 };
    }

    const plan = profile.plan || "free";
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
    const usedThisMonth = profile.usage_cents_this_month || 0;
    const monthlyRemaining = Math.max(0, limits.monthlyTokens - usedThisMonth);
    const purchasedTokens = profile.token_balance_cents || 0;

    // Deduct from monthly allowance first, then purchased tokens
    let newUsedThisMonth = usedThisMonth;
    let newPurchasedTokens = purchasedTokens;

    if (costCents <= monthlyRemaining) {
      // Fully covered by monthly allowance
      newUsedThisMonth = usedThisMonth + costCents;
    } else {
      // Use remaining monthly + some purchased
      const fromMonthly = monthlyRemaining;
      const fromPurchased = costCents - fromMonthly;
      newUsedThisMonth = usedThisMonth + fromMonthly;
      newPurchasedTokens = Math.max(0, purchasedTokens - fromPurchased);
    }

    // Update profile
    await getSupabaseAdminRuntimeClient()
      .from("user_profiles")
      .update({
        usage_cents_this_month: newUsedThisMonth,
        token_balance_cents: newPurchasedTokens,
      })
      .eq("user_id_uuid", userId);

    // Log usage
    await getSupabaseAdminRuntimeClient().from("usage_logs").insert({
      user_id_uuid: userId,
      owner_user_id_legacy: userId,
      feature,
      tokens_used: totalTokens,
      cost_cents: costCents,
      model,
      metadata: (metadata || {}) as any,
    });

    // Check usage alerts
    await checkUsageAlerts(userId, limits.monthlyTokens, newUsedThisMonth, newPurchasedTokens);

    const newMonthlyRemaining = Math.max(0, limits.monthlyTokens - newUsedThisMonth);
    const remainingTokens = newMonthlyRemaining + newPurchasedTokens;

    return {
      success: true,
      tokensUsed: costCents,
      remainingTokens,
    };
  } catch (err) {
    console.error("Usage tracking error:", err);
    return { success: false, tokensUsed: 0, remainingTokens: 0 };
  }
}

/**
 * Track voice/transcription usage
 */
export async function trackVoiceUsage(
  userId: string,
  durationMinutes: number,
  feature: string = "voice_transcription"
): Promise<UsageResult> {
  const costCents = calculateTranscriptionCost(durationMinutes);

  return trackAIUsage(userId, feature, "whisper-1", {}, {
    duration_minutes: durationMinutes,
    cost_cents: costCents,
  });
}

/**
 * Track TTS usage
 */
export async function trackTTSUsage(
  userId: string,
  characters: number,
  hd: boolean = false
): Promise<UsageResult> {
  const costCents = calculateTTSCost(characters, hd);
  const model = hd ? "tts-1-hd" : "tts-1";

  return trackAIUsage(userId, "tts", model, {}, {
    characters,
    cost_cents: costCents,
  });
}

/**
 * Get daily AI call count for rate limiting
 */
async function getDailyAICallCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await getSupabaseAdminRuntimeClient()
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id_uuid", userId)
    .gte("created_at", today.toISOString());

  return count || 0;
}

/**
 * Get usage summary for a user
 */
export async function getUsageSummary(userId: string) {
  const { data: profile } = await getSupabaseAdminRuntimeClient()
    .from("user_profiles")
    .select("plan, usage_cents_this_month, token_balance_cents")
    .eq("user_id_uuid", userId)
    .single();

  if (!profile) {
    return null;
  }

  const plan = profile.plan || "free";
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
  const usedThisMonth = profile.usage_cents_this_month || 0;
  const monthlyRemaining = Math.max(0, limits.monthlyTokens - usedThisMonth);
  const purchasedTokens = profile.token_balance_cents || 0;

  return {
    plan,
    monthlyLimit: limits.monthlyTokens,
    usedThisMonth,
    monthlyRemaining,
    purchasedTokens,
    totalAvailable: monthlyRemaining + purchasedTokens,
    percentUsed: Math.round((usedThisMonth / limits.monthlyTokens) * 100),
  };
}

/**
 * Higher-order function to wrap AI calls with usage tracking
 */
export function withUsageTracking<T>(
  feature: string,
  aiFunction: () => Promise<{ result: T; model: string; usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }>
) {
  return async (userId: string): Promise<{ result: T; usageResult: UsageResult } | { error: string; requiresUpgrade: boolean }> => {
    // Pre-check
    const check = await canMakeAICall(userId, feature, 5); // Estimate 5 cents
    if (!check.allowed) {
      return { error: check.reason || "Usage limit reached", requiresUpgrade: check.requiresUpgrade };
    }

    // Execute AI call
    const { result, model, usage } = await aiFunction();

    // Track usage
    const usageResult = await trackAIUsage(userId, feature, model, usage);

    return { result, usageResult };
  };
}
/**
 * Quick wrapper for API routes - add at start of POST handler
 */
export async function requireTokens(
  userId: string | null,
  feature: string,
  estimatedCost: number = 5
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  if (!userId) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    };
  }

  const check = await canMakeAICall(userId, feature, estimatedCost);
  if (!check.allowed) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({
        error: check.reason,
        requiresUpgrade: check.requiresUpgrade,
      }), {
        status: 402,
        headers: { "Content-Type": "application/json" }
      })
    };
  }

  return { allowed: true };
}
