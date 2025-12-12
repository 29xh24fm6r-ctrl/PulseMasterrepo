// Finance Accounts
// lib/finance/accounts.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface FinanceAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  institution?: string;
  currency: string;
  is_active: boolean;
  balance: number;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all accounts for a user
 */
export async function getUserAccounts(userId: string): Promise<FinanceAccount[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data, error } = await supabaseAdmin
    .from("finance_accounts")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("is_active", true)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[FinanceAccounts] Error fetching accounts:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    institution: row.institution || undefined,
    currency: row.currency || "USD",
    is_active: row.is_active,
    balance: parseFloat(row.balance || 0),
    last_synced_at: row.last_synced_at || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Create or update an account
 */
export async function upsertAccount(
  userId: string,
  data: {
    id?: string;
    name: string;
    type: string;
    institution?: string;
    currency?: string;
  }
): Promise<FinanceAccount> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const accountData: any = {
    user_id: dbUserId,
    name: data.name,
    type: data.type,
    institution: data.institution || null,
    currency: data.currency || "USD",
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    // Update existing
    const { data: updated, error } = await supabaseAdmin
      .from("finance_accounts")
      .update(accountData)
      .eq("id", data.id)
      .eq("user_id", dbUserId)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update account: ${error.message}`);
    return mapAccountRow(updated);
  } else {
    // Create new
    const { data: created, error } = await supabaseAdmin
      .from("finance_accounts")
      .insert(accountData)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create account: ${error.message}`);
    return mapAccountRow(created);
  }
}

/**
 * Update account balance from transactions
 */
export async function updateAccountBalanceFromTransactions(
  accountId: string
): Promise<void> {
  const { data: transactions } = await supabaseAdmin
    .from("finance_transactions")
    .select("amount, is_transfer")
    .eq("account_id", accountId);

  if (!transactions) return;

  // Sum all non-transfer transactions
  const balance = transactions
    .filter((t) => !t.is_transfer)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  await supabaseAdmin
    .from("finance_accounts")
    .update({ balance, updated_at: new Date().toISOString() })
    .eq("id", accountId);
}

/**
 * Helper to map database row to FinanceAccount
 */
function mapAccountRow(row: any): FinanceAccount {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    institution: row.institution || undefined,
    currency: row.currency || "USD",
    is_active: row.is_active,
    balance: parseFloat(row.balance || 0),
    last_synced_at: row.last_synced_at || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}




