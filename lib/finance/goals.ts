// Finance Goals
// lib/finance/goals.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getUserAccounts } from "./accounts";

export interface FinanceGoal {
  id: string;
  user_id: string;
  name: string;
  type: string;
  target_amount?: number;
  current_amount: number;
  deadline?: string;
  linked_account_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all goals for a user
 */
export async function getUserGoals(userId: string): Promise<FinanceGoal[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data, error } = await supabaseAdmin
    .from("finance_goals")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[FinanceGoals] Error fetching goals:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    target_amount: row.target_amount ? parseFloat(row.target_amount) : undefined,
    current_amount: parseFloat(row.current_amount || 0),
    deadline: row.deadline || undefined,
    linked_account_id: row.linked_account_id || undefined,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Create or update a goal
 */
export async function upsertGoal(
  userId: string,
  data: {
    id?: string;
    name: string;
    type: string;
    target_amount?: number;
    deadline?: string;
    linked_account_id?: string;
  }
): Promise<FinanceGoal> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const goalData: any = {
    user_id: dbUserId,
    name: data.name,
    type: data.type,
    target_amount: data.target_amount || null,
    deadline: data.deadline || null,
    linked_account_id: data.linked_account_id || null,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    // Update existing
    const { data: updated, error } = await supabaseAdmin
      .from("finance_goals")
      .update(goalData)
      .eq("id", data.id)
      .eq("user_id", dbUserId)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update goal: ${error.message}`);
    return mapGoalRow(updated);
  } else {
    // Create new
    const { data: created, error } = await supabaseAdmin
      .from("finance_goals")
      .insert(goalData)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create goal: ${error.message}`);
    return mapGoalRow(created);
  }
}

/**
 * Update goal progress from linked accounts
 */
export async function updateGoalProgressFromAccounts(userId: string): Promise<void> {
  const goals = await getUserGoals(userId);
  const accounts = await getUserAccounts(userId);

  for (const goal of goals) {
    if (goal.linked_account_id) {
      const account = accounts.find((a) => a.id === goal.linked_account_id);
      if (account) {
        let newCurrent = goal.current_amount;

        if (goal.type === "savings") {
          // For savings goals, use account balance
          newCurrent = account.balance;
        } else if (goal.type === "debt_paydown") {
          // For debt, track how much has been paid down
          // This would need initial balance stored somewhere - for v1, use current balance
          newCurrent = Math.abs(account.balance); // Debt is negative balance
        }

        if (newCurrent !== goal.current_amount) {
          await supabaseAdmin
            .from("finance_goals")
            .update({
              current_amount: newCurrent,
              updated_at: new Date().toISOString(),
            })
            .eq("id", goal.id);

          // Mark as completed if target reached
          if (goal.target_amount && newCurrent >= goal.target_amount) {
            await supabaseAdmin
              .from("finance_goals")
              .update({ status: "completed" })
              .eq("id", goal.id);
          }
        }
      }
    }
  }
}

/**
 * Helper to map database row to FinanceGoal
 */
function mapGoalRow(row: any): FinanceGoal {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    target_amount: row.target_amount ? parseFloat(row.target_amount) : undefined,
    current_amount: parseFloat(row.current_amount || 0),
    deadline: row.deadline || undefined,
    linked_account_id: row.linked_account_id || undefined,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}




