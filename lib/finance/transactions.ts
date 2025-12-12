// Finance Transactions & Categorization
// lib/finance/transactions.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

export interface FinanceTransaction {
  id: string;
  user_id: string;
  account_id: string;
  date: string;
  description?: string;
  amount: number;
  category?: string;
  subcategory?: string;
  is_transfer: boolean;
  metadata: any;
  created_at: string;
}

/**
 * Import transactions from CSV
 */
export async function importTransactionsFromCsv(
  userId: string,
  accountId: string,
  csvData: string
): Promise<{ importedCount: number }> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Parse CSV (simple parser - can be enhanced)
  const lines = csvData.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // Find column indices
  const dateIdx = headers.findIndex((h) => h.includes("date"));
  const descIdx = headers.findIndex((h) => h.includes("description") || h.includes("memo") || h.includes("payee"));
  const amountIdx = headers.findIndex((h) => h.includes("amount"));

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error("CSV must contain 'date' and 'amount' columns");
  }

  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const dateStr = values[dateIdx]?.trim();
    const amountStr = values[amountIdx]?.trim();
    const description = descIdx >= 0 ? values[descIdx]?.trim() : "";

    if (!dateStr || !amountStr) continue;

    const date = new Date(dateStr);
    const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ""));

    if (isNaN(amount) || isNaN(date.getTime())) continue;

    // Auto-categorize
    const category = await categorizeTransactionDescription(description, amount);

    transactions.push({
      user_id: dbUserId,
      account_id: accountId,
      date: date.toISOString().split("T")[0],
      description: description || undefined,
      amount,
      category: category.category,
      subcategory: category.subcategory,
      is_transfer: false,
      metadata: {},
    });
  }

  if (transactions.length === 0) {
    return { importedCount: 0 };
  }

  const { error } = await supabaseAdmin
    .from("finance_transactions")
    .insert(transactions);

  if (error) {
    throw new Error(`Failed to import transactions: ${error.message}`);
  }

  // Update account balance
  await updateAccountBalanceFromTransactions(accountId);

  return { importedCount: transactions.length };
}

/**
 * Categorize a transaction using LLM
 */
async function categorizeTransactionDescription(
  description: string,
  amount: number
): Promise<{ category: string; subcategory?: string }> {
  const isIncome = amount > 0;

  const prompt = `Categorize this financial transaction:

Description: "${description}"
Amount: ${amount > 0 ? "+" : ""}${amount.toFixed(2)}
Type: ${isIncome ? "Income" : "Expense"}

Use this taxonomy:
- income (salary, freelance, investment returns, gifts)
- housing (rent, mortgage, utilities, maintenance)
- food (groceries, restaurants, delivery)
- transport (gas, public transit, car payment, parking)
- debt (credit card payment, loan payment, interest)
- subscriptions (streaming, software, memberships)
- fun (entertainment, hobbies, travel)
- business_expense (if clearly business-related)
- healthcare (medical, dental, insurance)
- savings (transfers to savings/investment accounts)
- other

Output JSON:
{
  "category": "one of the above",
  "subcategory": "optional more specific label"
}`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      json: true,
      max_tokens: 100,
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;
    return {
      category: parsed.category || (isIncome ? "income" : "other"),
      subcategory: parsed.subcategory,
    };
  } catch (err) {
    console.error("[FinanceTransactions] Categorization failed:", err);
    // Fallback to simple rules
    const descLower = description.toLowerCase();
    if (isIncome) return { category: "income" };
    if (descLower.includes("rent") || descLower.includes("mortgage")) return { category: "housing" };
    if (descLower.includes("food") || descLower.includes("restaurant") || descLower.includes("grocery")) return { category: "food" };
    if (descLower.includes("gas") || descLower.includes("uber") || descLower.includes("car")) return { category: "transport" };
    return { category: "other" };
  }
}

/**
 * Auto-categorize new uncategorized transactions
 */
export async function autoCategorizeNewTransactions(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data: uncategorized } = await supabaseAdmin
    .from("finance_transactions")
    .select("*")
    .eq("user_id", dbUserId)
    .is("category", null)
    .limit(50);

  if (!uncategorized || uncategorized.length === 0) return;

  for (const tx of uncategorized) {
    const category = await categorizeTransactionDescription(
      tx.description || "",
      parseFloat(tx.amount || 0)
    );

    await supabaseAdmin
      .from("finance_transactions")
      .update({
        category: category.category,
        subcategory: category.subcategory || null,
      })
      .eq("id", tx.id);
  }
}

/**
 * Get transactions for a user
 */
export async function getUserTransactions(
  userId: string,
  options?: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
  }
): Promise<FinanceTransaction[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("finance_transactions")
    .select("*")
    .eq("user_id", dbUserId)
    .order("date", { ascending: false });

  if (options?.accountId) {
    query = query.eq("account_id", options.accountId);
  }
  if (options?.startDate) {
    query = query.gte("date", options.startDate);
  }
  if (options?.endDate) {
    query = query.lte("date", options.endDate);
  }
  if (options?.category) {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query.limit(1000);

  if (error) {
    console.error("[FinanceTransactions] Error fetching transactions:", error);
    return [];
  }

  return (data || []).map(mapTransactionRow);
}

/**
 * Helper to map database row to FinanceTransaction
 */
function mapTransactionRow(row: any): FinanceTransaction {
  return {
    id: row.id,
    user_id: row.user_id,
    account_id: row.account_id,
    date: row.date,
    description: row.description || undefined,
    amount: parseFloat(row.amount || 0),
    category: row.category || undefined,
    subcategory: row.subcategory || undefined,
    is_transfer: row.is_transfer || false,
    metadata: row.metadata || {},
    created_at: row.created_at,
  };
}

/**
 * Update account balance from transactions (imported from accounts.ts)
 */
async function updateAccountBalanceFromTransactions(accountId: string): Promise<void> {
  const { updateAccountBalanceFromTransactions } = await import("./accounts");
  return updateAccountBalanceFromTransactions(accountId);
}




