// XP Summary for Cortex
// lib/cortex/xp-summary.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface XPSummary {
  today: number;
  streakDays: number;
  domainBreakdown?: Record<string, number>;
}

/**
 * Get XP summary for Cortex context
 */
export async function getXPSummary(userId: string): Promise<XPSummary> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get today's XP
    const { data: todayXP } = await supabaseAdmin
      .from("xp_transactions")
      .select("amount, category, source")
      .eq("user_id", dbUserId)
      .gte("created_at", todayISO);

    const todayTotal = (todayXP || []).reduce((sum, t) => sum + (t.amount || 0), 0);

    // Get streak (consecutive days with XP)
    const { data: recentXP } = await supabaseAdmin
      .from("xp_transactions")
      .select("created_at")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(100);

    const streakDays = calculateStreak(recentXP || []);

    // Domain breakdown
    const domainBreakdown: Record<string, number> = {};
    for (const transaction of todayXP || []) {
      const domain = inferDomain(transaction.source, transaction.category);
      domainBreakdown[domain] = (domainBreakdown[domain] || 0) + (transaction.amount || 0);
    }

    return {
      today: todayTotal,
      streakDays,
      domainBreakdown,
    };
  } catch (err) {
    console.warn("[Cortex] Failed to get XP summary:", err);
    return {
      today: 0,
      streakDays: 0,
    };
  }
}

/**
 * Calculate streak from XP transactions
 */
function calculateStreak(transactions: Array<{ created_at: string }>): number {
  if (transactions.length === 0) return 0;

  const dates = new Set(
    transactions.map((t) => new Date(t.created_at).toISOString().split("T")[0])
  );
  const sortedDates = Array.from(dates).sort().reverse();

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  let currentDate = today;

  for (const date of sortedDates) {
    if (date === currentDate) {
      streak++;
      // Move to previous day
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 1);
      currentDate = prev.toISOString().split("T")[0];
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Infer domain from XP source/category
 */
function inferDomain(source: string, category: string): string {
  const sourceLower = source.toLowerCase();
  const categoryLower = category.toLowerCase();

  if (sourceLower.includes("relationship") || sourceLower.includes("contact")) {
    return "relationships";
  }
  if (sourceLower.includes("finance") || sourceLower.includes("money")) {
    return "finance";
  }
  if (sourceLower.includes("work") || sourceLower.includes("task") || sourceLower.includes("focus")) {
    return "work";
  }
  if (sourceLower.includes("habit") || sourceLower.includes("health")) {
    return "life";
  }
  if (sourceLower.includes("arc") || sourceLower.includes("strategy")) {
    return "strategy";
  }

  // Fallback to category
  return categoryLower || "general";
}



