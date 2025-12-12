// Finance Snapshots
// lib/finance/snapshots.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getUserTransactions } from "./transactions";

export interface FinanceSnapshot {
  id: string;
  user_id: string;
  period_start: string;
  period_type: string;
  income: number;
  expenses: number;
  savings: number;
  debt_paydown: number;
  net_cashflow: number;
  created_at: string;
}

/**
 * Build finance snapshot for a month
 */
export async function buildFinanceSnapshotForMonth(
  userId: string,
  month: string // 'YYYY-MM-01'
): Promise<FinanceSnapshot> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

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

  // Calculate aggregates
  let income = 0;
  let expenses = 0;
  let savings = 0;
  let debt_paydown = 0;

  for (const tx of transactions) {
    if (tx.is_transfer) continue;

    const amount = parseFloat(tx.amount || 0);

    if (amount > 0) {
      // Income
      if (tx.category === "income") {
        income += amount;
      } else if (tx.category === "savings") {
        savings += amount;
      }
    } else {
      // Expenses
      const absAmount = Math.abs(amount);
      expenses += absAmount;

      if (tx.category === "debt") {
        debt_paydown += absAmount;
      }
    }
  }

  const net_cashflow = income - expenses;

  // Upsert snapshot
  const snapshotData = {
    user_id: dbUserId,
    period_start: startDate,
    period_type: "month",
    income,
    expenses,
    savings,
    debt_paydown,
    net_cashflow,
  };

  const { data: existing } = await supabaseAdmin
    .from("finance_snapshots")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("period_start", startDate)
    .eq("period_type", "month")
    .maybeSingle();

  let snapshot;
  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from("finance_snapshots")
      .update(snapshotData)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update snapshot: ${error.message}`);
    snapshot = updated;
  } else {
    const { data: created, error } = await supabaseAdmin
      .from("finance_snapshots")
      .insert(snapshotData)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create snapshot: ${error.message}`);
    snapshot = created;
  }

  return {
    id: snapshot.id,
    user_id: snapshot.user_id,
    period_start: snapshot.period_start,
    period_type: snapshot.period_type,
    income: parseFloat(snapshot.income || 0),
    expenses: parseFloat(snapshot.expenses || 0),
    savings: parseFloat(snapshot.savings || 0),
    debt_paydown: parseFloat(snapshot.debt_paydown || 0),
    net_cashflow: parseFloat(snapshot.net_cashflow || 0),
    created_at: snapshot.created_at,
  };
}

/**
 * Get snapshots for a date range
 */
export async function getFinanceSnapshots(
  userId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    periodType?: string;
  }
): Promise<FinanceSnapshot[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("finance_snapshots")
    .select("*")
    .eq("user_id", dbUserId)
    .order("period_start", { ascending: false });

  if (options?.startDate) {
    query = query.gte("period_start", options.startDate);
  }
  if (options?.endDate) {
    query = query.lte("period_start", options.endDate);
  }
  if (options?.periodType) {
    query = query.eq("period_type", options.periodType);
  }

  const { data, error } = await query.limit(12);

  if (error) {
    console.error("[FinanceSnapshots] Error fetching snapshots:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    period_start: row.period_start,
    period_type: row.period_type,
    income: parseFloat(row.income || 0),
    expenses: parseFloat(row.expenses || 0),
    savings: parseFloat(row.savings || 0),
    debt_paydown: parseFloat(row.debt_paydown || 0),
    net_cashflow: parseFloat(row.net_cashflow || 0),
    created_at: row.created_at,
  }));
}




