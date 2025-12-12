// Finance Perception v2
// lib/agi/perception/finance.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface BillSummary {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category?: string;
  isRecurring: boolean;
}

export interface FinanceAnomaly {
  type: "unusual_expense" | "income_drop" | "spending_spike" | "bill_cluster";
  description: string;
  amount?: number;
  date: string;
  severity: "low" | "medium" | "high";
}

export interface FinancePerception {
  upcomingBills: BillSummary[];
  anomalies: FinanceAnomaly[];
  spendingDrift: number; // -1 to 1, negative = spending less, positive = spending more
  stressSignals: string[];
}

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

/**
 * Build finance perception for user
 */
export async function buildFinancePerception(userId: string): Promise<FinancePerception> {
  const dbUserId = await resolveUserId(userId);

  const perception: FinancePerception = {
    upcomingBills: [],
    anomalies: [],
    spendingDrift: 0,
    stressSignals: [],
  };

  try {
    // Get upcoming bills (next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: bills } = await supabaseAdmin
      .from("financial_obligations")
      .select("*")
      .eq("user_id", dbUserId)
      .gte("due_date", today.toISOString())
      .lte("due_date", thirtyDaysFromNow.toISOString())
      .order("due_date", { ascending: true });

    if (bills) {
      perception.upcomingBills = bills.map((bill) => ({
        id: bill.id,
        title: bill.title || bill.description || "Untitled Bill",
        amount: parseFloat(bill.amount || "0"),
        dueDate: bill.due_date,
        category: bill.category,
        isRecurring: bill.is_recurring || false,
      }));
    }

    // Get financial snapshots for anomaly detection
    const { data: snapshots } = await supabaseAdmin
      .from("financial_snapshots")
      .select("*")
      .eq("user_id", dbUserId)
      .order("snapshot_date", { ascending: false })
      .limit(6);

    if (snapshots && snapshots.length >= 2) {
      const recent = snapshots[0];
      const previous = snapshots[1];

      // Check for income drop
      const recentIncome = parseFloat(recent.income || "0");
      const previousIncome = parseFloat(previous.income || "0");
      if (recentIncome < previousIncome * 0.8 && previousIncome > 0) {
        perception.anomalies.push({
          type: "income_drop",
          description: `Income dropped ${Math.round(((previousIncome - recentIncome) / previousIncome) * 100)}%`,
          amount: previousIncome - recentIncome,
          date: recent.snapshot_date,
          severity: recentIncome < previousIncome * 0.5 ? "high" : "medium",
        });
      }

      // Check for spending spike
      const recentSpending = parseFloat(recent.expenses || "0");
      const previousSpending = parseFloat(previous.expenses || "0");
      if (recentSpending > previousSpending * 1.5 && previousSpending > 0) {
        perception.anomalies.push({
          type: "spending_spike",
          description: `Spending increased ${Math.round(((recentSpending - previousSpending) / previousSpending) * 100)}%`,
          amount: recentSpending - previousSpending,
          date: recent.snapshot_date,
          severity: recentSpending > previousSpending * 2 ? "high" : "medium",
        });
      }

      // Calculate spending drift
      if (previousSpending > 0) {
        perception.spendingDrift = (recentSpending - previousSpending) / previousSpending;
        perception.spendingDrift = Math.max(-1, Math.min(1, perception.spendingDrift)); // Clamp to -1..1
      }
    }

    // Check for bill clusters (multiple bills due within 3 days)
    if (perception.upcomingBills.length >= 3) {
      const sortedBills = [...perception.upcomingBills].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      for (let i = 0; i < sortedBills.length - 2; i++) {
        const bill1 = new Date(sortedBills[i].dueDate);
        const bill3 = new Date(sortedBills[i + 2].dueDate);
        const daysDiff = (bill3.getTime() - bill1.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff <= 3) {
          const totalAmount = sortedBills
            .slice(i, i + 3)
            .reduce((sum, b) => sum + b.amount, 0);
          perception.anomalies.push({
            type: "bill_cluster",
            description: `${i + 3} bills due within 3 days (total: $${totalAmount.toFixed(2)})`,
            amount: totalAmount,
            date: sortedBills[i].dueDate,
            severity: totalAmount > 1000 ? "high" : "medium",
          });
          break; // Only flag once
        }
      }
    }

    // Stress signals
    const totalUpcomingBills = perception.upcomingBills.reduce((sum, b) => sum + b.amount, 0);
    if (totalUpcomingBills > 2000) {
      perception.stressSignals.push("high_bill_load");
    }

    if (perception.spendingDrift > 0.3) {
      perception.stressSignals.push("spending_increase");
    }

    if (perception.anomalies.some((a) => a.severity === "high")) {
      perception.stressSignals.push("financial_anomalies");
    }

    // Check for unusual expenses (if transaction data available)
    try {
      const { data: recentTransactions } = await supabaseAdmin
        .from("financial_transactions")
        .select("amount, date, category")
        .eq("user_id", dbUserId)
        .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .lt("amount", "0") // Expenses only
        .order("date", { ascending: false })
        .limit(20);

      if (recentTransactions && recentTransactions.length > 0) {
        const avgExpense = Math.abs(
          recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0) /
            recentTransactions.length
        );

        const unusualExpenses = recentTransactions.filter(
          (t) => Math.abs(parseFloat(t.amount || "0")) > avgExpense * 3
        );

        for (const expense of unusualExpenses.slice(0, 3)) {
          perception.anomalies.push({
            type: "unusual_expense",
            description: `Unusual expense: $${Math.abs(parseFloat(expense.amount || "0")).toFixed(2)} in ${expense.category || "uncategorized"}`,
            amount: Math.abs(parseFloat(expense.amount || "0")),
            date: expense.date,
            severity: Math.abs(parseFloat(expense.amount || "0")) > 500 ? "high" : "medium",
          });
        }
      }
    } catch {
      // Transaction table may not exist
    }
  } catch (err: any) {
    console.warn("[Finance Perception] Failed to build perception:", err.message);
  }

  return perception;
}



