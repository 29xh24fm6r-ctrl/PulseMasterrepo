// Finance Cron Jobs
// lib/finance/cron.ts

import { buildFinanceSnapshotForMonth } from "./snapshots";
import { updateGoalProgressFromAccounts } from "./goals";
import { runFinanceInsightsForUser } from "./insights";
import { createFinanceGraphNodes, createFinanceGraphEdges } from "./graph-integration";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Run nightly finance maintenance for a user
 */
export async function runFinanceMaintenanceForUser(userId: string): Promise<void> {
  try {
    // 1. Build current month snapshot
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const monthStr = currentMonth.toISOString().split("T")[0];
    await buildFinanceSnapshotForMonth(userId, monthStr);

    // 2. Refresh goal progress from accounts
    await updateGoalProgressFromAccounts(userId);

    // 3. Run insights
    await runFinanceInsightsForUser(userId);

    // 4. Update Intelligence Graph nodes and edges
    await createFinanceGraphNodes(userId);
    await createFinanceGraphEdges(userId);
  } catch (err) {
    console.error(`[FinanceCron] Error running maintenance for user ${userId}:`, err);
  }
}

/**
 * Run finance maintenance for all active users with finance data
 */
export async function runFinanceMaintenanceForAllUsers(): Promise<void> {
  // Get all users who have at least one finance account
  const { data: users } = await supabaseAdmin
    .from("finance_accounts")
    .select("user_id")
    .eq("is_active", true);

  if (!users) return;

  const uniqueUserIds = Array.from(new Set(users.map((u) => u.user_id)));

  // Get clerk IDs for these users
  const { data: userRows } = await supabaseAdmin
    .from("users")
    .select("clerk_id")
    .in("id", uniqueUserIds);

  if (!userRows) return;

  for (const userRow of userRows) {
    if (userRow.clerk_id) {
      await runFinanceMaintenanceForUser(userRow.clerk_id);
    }
  }
}




