// Finance Budgets
// lib/finance/budgets.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getUserTransactions } from "./transactions";

export interface FinanceBudget {
  id: string;
  user_id: string;
  month: string;
  category: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetVsActual {
  category: string;
  budgeted: number;
  actual: number;
  difference: number;
  percentUsed: number;
}

/**
 * Get budgets for a month
 */
export async function getBudgetsForMonth(
  userId: string,
  month: string // 'YYYY-MM-01'
): Promise<FinanceBudget[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data, error } = await supabaseAdmin
    .from("finance_budgets")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("month", month);

  if (error) {
    console.error("[FinanceBudgets] Error fetching budgets:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    month: row.month,
    category: row.category,
    amount: parseFloat(row.amount || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Set or update a budget
 */
export async function upsertBudget(
  userId: string,
  data: {
    month: string;
    category: string;
    amount: number;
  }
): Promise<FinanceBudget> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const budgetData = {
    user_id: dbUserId,
    month: data.month,
    category: data.category,
    amount: data.amount,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
    .from("finance_budgets")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("month", data.month)
    .eq("category", data.category)
    .maybeSingle();

  if (existing) {
    // Update
    const { data: updated, error } = await supabaseAdmin
      .from("finance_budgets")
      .update(budgetData)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update budget: ${error.message}`);
    return {
      id: updated.id,
      user_id: updated.user_id,
      month: updated.month,
      category: updated.category,
      amount: parseFloat(updated.amount || 0),
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  } else {
    // Create
    const { data: created, error } = await supabaseAdmin
      .from("finance_budgets")
      .insert(budgetData)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create budget: ${error.message}`);
    return {
      id: created.id,
      user_id: created.user_id,
      month: created.month,
      category: created.category,
      amount: parseFloat(created.amount || 0),
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }
}

/**
 * Get budget vs actual for a month
 */
export async function getBudgetVsActualForMonth(
  userId: string,
  month: string // 'YYYY-MM-01'
): Promise<BudgetVsActual[]> {
  const budgets = await getBudgetsForMonth(userId, month);

  // Get start and end of month
  const monthDate = new Date(month);
  const startDate = monthDate.toISOString().split("T")[0];
  const nextMonth = new Date(monthDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const endDate = nextMonth.toISOString().split("T")[0];

  // Get transactions for the month
  const transactions = await getUserTransactions(userId, {
    startDate,
    endDate,
  });

  // Group transactions by category
  const actualByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.amount < 0 && tx.category && !tx.is_transfer) {
      // Only count expenses (negative amounts)
      const current = actualByCategory.get(tx.category) || 0;
      actualByCategory.set(tx.category, current + Math.abs(tx.amount));
    }
  }

  // Build comparison
  const results: BudgetVsActual[] = [];
  for (const budget of budgets) {
    const actual = actualByCategory.get(budget.category) || 0;
    const difference = budget.amount - actual;
    const percentUsed = budget.amount > 0 ? (actual / budget.amount) * 100 : 0;

    results.push({
      category: budget.category,
      budgeted: budget.amount,
      actual,
      difference,
      percentUsed,
    });
  }

  return results;
}




