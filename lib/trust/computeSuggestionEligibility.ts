/**
 * Trust-Weighted Suggestion Eligibility
 */

export type SuggestionEligibility = {
    allowed: boolean;
    max_strength: "soft" | "neutral";
    reason?: string;
}

export type TrustContext = {
    confidenceScore: number; // 0-1
    recentRejections: number; // Count in last session/hour
    lastAcceptedAt?: number; // Timestamp
    mode: "NORMAL" | "STRESSED" | "URGENT";
}

/**
 * Determines if Pulse is allowed to proactively suggest an action.
 * 
 * Rules:
 * - Low confidence (< 0.7) -> NO suggestions allowed (Silent).
 * - Recent rejections (> 2) -> NO suggestions allowed (Back off).
 * - Stressed mode -> NO suggestions allowed (Minimize cognitive load).
 * - High confidence (> 0.9) -> "neutral" strength allowed.
 * - Medium confidence (0.7-0.9) -> "soft" strength only.
 */
export function computeSuggestionEligibility(ctx: TrustContext): SuggestionEligibility {
    // 1. Hard Stoppers
    if (ctx.mode === "STRESSED") {
        return { allowed: false, max_strength: "soft", reason: "User is stressed" };
    }

    if (ctx.recentRejections > 2) {
        return { allowed: false, max_strength: "soft", reason: "Too many recent rejections" };
    }

    if (ctx.confidenceScore < 0.7) {
        return { allowed: false, max_strength: "soft", reason: "Low confidence" };
    }

    // 2. Strength Determination
    if (ctx.confidenceScore >= 0.9) {
        return { allowed: true, max_strength: "neutral" };
    }

    return { allowed: true, max_strength: "soft" };
}
