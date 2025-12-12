// Financial Intelligence Engine
// lib/finance/insights.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getBudgetVsActualForMonth } from "./budgets";
import { getUserGoals } from "./goals";
import { getFinanceSnapshots } from "./snapshots";
import { llmComplete } from "@/lib/llm/client";

export interface FinanceAlert {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  severity: number;
  is_positive: boolean;
  created_at: string;
  seen_at?: string;
  dismissed_at?: string;
}

/**
 * Run financial insights for a user
 */
export async function runFinanceInsightsForUser(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load snapshots for last 3-6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const snapshots = await getFinanceSnapshots(userId, {
    startDate: sixMonthsAgo.toISOString().split("T")[0],
    periodType: "month",
  });

  // 2. Load current month budget vs actual
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const monthStr = currentMonth.toISOString().split("T")[0];
  const budgetVsActual = await getBudgetVsActualForMonth(userId, monthStr);

  // 3. Load active goals
  const goals = await getUserGoals(userId);

  // 4. Detect patterns and generate alerts
  const alerts: Array<{
    type: string;
    title: string;
    body: string;
    severity: number;
    is_positive: boolean;
  }> = [];

  // Overspend alerts (only if > 120% of budget)
  for (const bva of budgetVsActual) {
    if (bva.percentUsed > 120) {
      const overspendPercent = Math.round(bva.percentUsed - 100);
      alerts.push({
        type: "overspend",
        title: `Over budget in ${bva.category}`,
        body: await generateOverspendAlert(bva.category, overspendPercent, bva.difference),
        severity: overspendPercent > 50 ? 4 : overspendPercent > 20 ? 3 : 2,
        is_positive: false,
      });
    }
  }

  // Runway risk (negative cashflow for multiple months)
  if (snapshots.length >= 3) {
    const recentSnapshots = snapshots.slice(0, 3);
    const negativeMonths = recentSnapshots.filter((s) => s.net_cashflow < 0).length;
    if (negativeMonths >= 2) {
      alerts.push({
        type: "runway_risk",
        title: "Spending pattern may need attention",
        body: await generateRunwayAlert(recentSnapshots),
        severity: negativeMonths === 3 ? 4 : 3,
        is_positive: false,
      });
    }
  }

  // Trigger AGI for financial anomalies
  const anomalyAlerts = alerts.filter((a) => !a.is_positive && a.severity >= 3);
  if (anomalyAlerts.length > 0) {
    try {
      const { handleAGIEvent } = await import("@/lib/agi/orchestrator");
      const { financeSignalTrigger } = await import("@/lib/agi/triggers");
      
      // Get upcoming bills count if available
      let upcomingBillsCount = 0;
      try {
        const { data: bills } = await supabaseAdmin
          .from("bills")
          .select("id")
          .eq("user_id", dbUserId)
          .gte("due_date", new Date().toISOString().split("T")[0])
          .limit(10);
        upcomingBillsCount = bills?.length || 0;
      } catch {
        // Bills table may not exist
      }

      await handleAGIEvent(userId, financeSignalTrigger({
        anomalyType: anomalyAlerts[0].type,
        upcomingBillsCount,
        cashflowTrend: snapshots.length >= 2 && snapshots[0].net_cashflow < snapshots[1].net_cashflow ? "declining" : "stable",
      }));
    } catch (agiErr) {
      console.warn("[Finance Insights] AGI trigger failed:", agiErr);
    }
  }

  // Positive trends
  if (snapshots.length >= 3) {
    const recent = snapshots.slice(0, 3);
    const savingsTrend = recent.map((s) => s.savings);
    if (savingsTrend[0] > savingsTrend[1] && savingsTrend[1] > savingsTrend[2]) {
      alerts.push({
        type: "positive_trend",
        title: "Savings rate improving",
        body: await generatePositiveTrendAlert("savings", recent),
        severity: 2,
        is_positive: true,
      });
    }

    const cashflowTrend = recent.map((s) => s.net_cashflow);
    if (cashflowTrend[0] > cashflowTrend[1] && cashflowTrend[1] > cashflowTrend[2]) {
      alerts.push({
        type: "positive_trend",
        title: "Cashflow improving",
        body: await generatePositiveTrendAlert("cashflow", recent),
        severity: 2,
        is_positive: true,
      });
    }
  }

  // Goal progress
  for (const goal of goals) {
    if (goal.target_amount && goal.current_amount > 0) {
      const percentComplete = (goal.current_amount / goal.target_amount) * 100;
      if (percentComplete >= 50 && percentComplete < 100) {
        alerts.push({
          type: "goal_progress",
          title: `Progress on ${goal.name}`,
          body: await generateGoalProgressAlert(goal, percentComplete),
          severity: 1,
          is_positive: true,
        });
      }
    }
  }

  // 5. Save alerts (avoid duplicates by checking recent alerts)
  const { data: recentAlerts } = await supabaseAdmin
    .from("finance_alerts")
    .select("type, title")
    .eq("user_id", dbUserId)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .is("dismissed_at", null);

  const recentTypes = new Set(recentAlerts?.map((a) => `${a.type}:${a.title}`) || []);

  for (const alert of alerts) {
    const key = `${alert.type}:${alert.title}`;
    if (!recentTypes.has(key)) {
      await supabaseAdmin.from("finance_alerts").insert({
        user_id: dbUserId,
        type: alert.type,
        title: alert.title,
        body: alert.body,
        severity: alert.severity,
        is_positive: alert.is_positive,
      });
    }
  }
}

/**
 * Generate overspend alert text
 */
async function generateOverspendAlert(
  category: string,
  overspendPercent: number,
  difference: number
): Promise<string> {
  const prompt = `Generate a gentle, non-shaming alert about overspending:

Category: ${category}
Overspend: ${overspendPercent}% over budget ($${Math.abs(difference).toFixed(2)})

Use language like "may be worth paying attention to" or "might want to consider". No shame, no judgment.

Output just the alert text, 1-2 sentences.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 100,
    });
    return typeof response === "string" ? response : `You've spent ${overspendPercent}% over your ${category} budget this month. This may be worth paying attention to.`;
  } catch (err) {
    return `You've spent ${overspendPercent}% over your ${category} budget this month. This may be worth paying attention to.`;
  }
}

/**
 * Generate runway risk alert
 */
async function generateRunwayAlert(snapshots: any[]): Promise<string> {
  const avgCashflow = snapshots.reduce((sum, s) => sum + s.net_cashflow, 0) / snapshots.length;
  const prompt = `Generate a gentle alert about spending sustainability:

Average monthly cashflow: $${avgCashflow.toFixed(2)} (negative)
Months analyzed: ${snapshots.length}

Use language like "may not be sustainable" or "might want to consider". No panic, no judgment.

Output just the alert text, 1-2 sentences.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 100,
    });
    return typeof response === "string" ? response : `Your current spending pattern may not be sustainable over the long term. You might want to consider reviewing your expenses.`;
  } catch (err) {
    return `Your current spending pattern may not be sustainable over the long term. You might want to consider reviewing your expenses.`;
  }
}

/**
 * Generate positive trend alert
 */
async function generatePositiveTrendAlert(
  trendType: string,
  snapshots: any[]
): Promise<string> {
  const prompt = `Generate a positive, encouraging alert about financial progress:

Trend: ${trendType} is improving over the last ${snapshots.length} months
Values: ${snapshots.map((s) => s[trendType === "savings" ? "savings" : "net_cashflow"]).join(", ")}

Use encouraging language like "You've been making progress!" or "Great work!". Keep it brief.

Output just the alert text, 1 sentence.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 80,
    });
    return typeof response === "string" ? response : `You've been making progress on your ${trendType}! Keep it up.`;
  } catch (err) {
    return `You've been making progress on your ${trendType}! Keep it up.`;
  }
}

/**
 * Generate goal progress alert
 */
async function generateGoalProgressAlert(goal: any, percentComplete: number): Promise<string> {
  const prompt = `Generate an encouraging alert about goal progress:

Goal: ${goal.name}
Progress: ${percentComplete.toFixed(0)}% complete ($${goal.current_amount.toFixed(2)} of $${goal.target_amount?.toFixed(2)})

Use encouraging language. Keep it brief.

Output just the alert text, 1 sentence.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 80,
    });
    return typeof response === "string" ? response : `You're ${percentComplete.toFixed(0)}% of the way to your ${goal.name} goal!`;
  } catch (err) {
    return `You're ${percentComplete.toFixed(0)}% of the way to your ${goal.name} goal!`;
  }
}

/**
 * Get alerts for a user
 */
export async function getUserFinanceAlerts(
  userId: string,
  options?: {
    limit?: number;
    includeDismissed?: boolean;
  }
): Promise<FinanceAlert[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("finance_alerts")
    .select("*")
    .eq("user_id", dbUserId)
    .order("created_at", { ascending: false });

  if (!options?.includeDismissed) {
    query = query.is("dismissed_at", null);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[FinanceInsights] Error fetching alerts:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    severity: row.severity || 1,
    is_positive: row.is_positive || false,
    created_at: row.created_at,
    seen_at: row.seen_at || undefined,
    dismissed_at: row.dismissed_at || undefined,
  }));
}

