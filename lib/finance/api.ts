// Finance API Helpers
// lib/finance/api.ts

import { getUserAccounts } from "./accounts";
import { getUserTransactions } from "./transactions";
import { getBudgetVsActualForMonth } from "./budgets";
import { getUserGoals } from "./goals";
import { getFinanceSnapshots, buildFinanceSnapshotForMonth } from "./snapshots";
import { getUserFinanceAlerts } from "./insights";

/**
 * Get finance overview for a user
 */
export async function getFinanceOverview(userId: string): Promise<any> {
  // Get current month
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const monthStr = currentMonth.toISOString().split("T")[0];

  // Get start and end of month for transactions
  const startDate = monthStr;
  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const endDate = nextMonth.toISOString().split("T")[0];

  const [accounts, transactions, budgets, goals, alerts] = await Promise.all([
    getUserAccounts(userId),
    getUserTransactions(userId, { startDate, endDate }),
    getBudgetVsActualForMonth(userId, monthStr),
    getUserGoals(userId),
    getUserFinanceAlerts(userId, { limit: 5 }),
  ]);

  // Calculate current month summary
  let income = 0;
  let expenses = 0;

  for (const tx of transactions) {
    if (tx.is_transfer) continue;
    const amount = parseFloat(tx.amount || 0);
    if (amount > 0) {
      if (tx.category === "income") {
        income += amount;
      }
    } else {
      expenses += Math.abs(amount);
    }
  }

  const netCashflow = income - expenses;

  return {
    accounts,
    currentMonth: {
      income,
      expenses,
      netCashflow,
    },
    budgets,
    goals,
    alerts,
  };
}




