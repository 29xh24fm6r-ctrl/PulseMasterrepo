# 🧠 PULSE OS — PHASE 15 MEGA SPEC

## Financial Brain & AI Accounting OS (Personal + Business)

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Turn Pulse into an **AI-driven accounting and money management system**:

>
> A unified **Financial Brain** that:

> * Tracks **personal + business cashflows**

> * Maintains a **double-entry ledger**

> * Auto-categorizes + reconciles transactions

> * Does **cashflow forecasting** and budget envelopes

> * Integrates tightly with **AGI, vertical packs, households, and deals**

> * Feels like having **Dave Ramsey + a world-class CFO + a modern FP&A team** in your pocket (without making regulated financial advice claims)

Phases 1–14 are assumed to be in place:

* AGI Kernel, agents, planner, executor

* Vertical packs (incl. Banking / Lending)

* Household / org / team AGI

* Voice OS + mobile + call intelligence

* Onboarding, teaching system, scenarios

* Communication Mastery Engine + Philosophy Dojo v3

---

## 0. GUIDING PRINCIPLES

1. **Single unified money brain** for both personal & business (but separated logically).

2. **Double-entry ledger** under the hood – not just "tags".

3. **AGI-aware**: finances must show up in WorldState and influence planning.

4. **Human-first**: the UI is "Money Clarity," not accountant-only gibberish.

5. **Safe**: no direct trading or transfers; purely planning, projection, and insight.

---

# SECTION 1 — DATABASE LAYER

Create migrations in `/supabase/migrations/`.

## 1.1. Core Accounts & Ledger

Migration: `20251231_financial_core_v1.sql`

```sql
-- ============================================
-- PULSE FINANCIAL CORE V1
-- Double-entry accounting: accounts + ledger
-- ============================================

create table if not exists public.financial_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  org_id uuid references organizations(id),
  household_id uuid references households(id),

  -- 'personal' | 'business' | 'household'
  scope text not null default 'personal',

  name text not null,
  description text,

  created_at timestamptz not null default now()
);

create index if not exists financial_entities_user_idx
  on public.financial_entities(user_id);

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.financial_entities(id) on delete cascade,

  name text not null,
  code text,                      -- optional chart-of-accounts code
  type text not null,             -- 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  subtype text,                   -- 'cash', 'loan', 'revenue', 'cogs', etc.

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

create index if not exists financial_accounts_entity_idx
  on public.financial_accounts(entity_id);

create table if not exists public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.financial_entities(id) on delete cascade,

  -- Each ledger entry will have one or more lines (debits/credits)
  description text,
  event_date date not null,
  created_at timestamptz not null default now(),

  source jsonb not null default '{}'::jsonb   -- metadata about import/source system
);

create index if not exists financial_ledger_entries_entity_idx
  on public.financial_ledger_entries(entity_id);

create index if not exists financial_ledger_entries_event_date_idx
  on public.financial_ledger_entries(event_date);

create table if not exists public.financial_ledger_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.financial_ledger_entries(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete cascade,

  debit numeric not null default 0,
  credit numeric not null default 0,

  memo text,
  created_at timestamptz not null default now()
);

create index if not exists financial_ledger_lines_entry_idx
  on public.financial_ledger_lines(entry_id);

create index if not exists financial_ledger_lines_account_idx
  on public.financial_ledger_lines(account_id);
```

---

## 1.2. Connections & Imports

Migration: `20251231_financial_connections_v1.sql`

```sql
-- ============================================
-- PULSE FINANCIAL CONNECTIONS & IMPORTS V1
-- Bank connections and imported transactions
-- ============================================

create table if not exists public.financial_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  entity_id uuid references public.financial_entities(id),

  provider text not null,       -- 'plaid', 'manual_import', 'csv'
  name text not null,           -- 'Chase Checking', 'AmEx Biz', etc.
  status text not null default 'active', -- 'active', 'disabled'

  created_at timestamptz not null default now()
);

create index if not exists financial_connections_user_idx
  on public.financial_connections(user_id);

create table if not exists public.financial_imported_transactions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.financial_connections(id) on delete cascade,
  raw_id text,                  -- provider-specific id
  posted_at timestamptz not null,
  amount numeric not null,      -- positive for inflow, negative for outflow
  currency text not null default 'USD',
  description text,
  raw jsonb not null default '{}'::jsonb,

  -- Link to ledger entry if reconciled
  ledger_entry_id uuid references public.financial_ledger_entries(id),

  created_at timestamptz not null default now()
);

create unique index if not exists financial_imported_transactions_unique_raw
  on public.financial_imported_transactions(connection_id, raw_id);

create index if not exists financial_imported_transactions_connection_idx
  on public.financial_imported_transactions(connection_id);
```

---

## 1.3. Budgets / Envelopes & Snapshots

Migration: `20251231_financial_planning_v1.sql`

```sql
-- ============================================
-- PULSE FINANCIAL PLANNING V1
-- Budgets, envelopes, and financial snapshots
-- ============================================

create table if not exists public.financial_budgets (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.financial_entities(id) on delete cascade,
  name text not null,
  period text not null,         -- 'monthly', 'weekly', 'custom'
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create index if not exists financial_budgets_entity_idx
  on public.financial_budgets(entity_id);

create table if not exists public.financial_budget_envelopes (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.financial_budgets(id) on delete cascade,
  name text not null,           -- 'Rent', 'Groceries', 'Marketing', etc.
  account_id uuid references public.financial_accounts(id),
  target_amount numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists financial_budget_envelopes_budget_idx
  on public.financial_budget_envelopes(budget_id);

create table if not exists public.financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.financial_entities(id) on delete cascade,
  as_of_date date not null,

  -- aggregated metrics snapshot
  net_worth numeric,
  cash_balance numeric,
  total_debt numeric,
  trailing_30d_spend numeric,
  trailing_30d_income numeric,

  data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists financial_snapshots_entity_date_idx
  on public.financial_snapshots(entity_id, as_of_date);
```

---

# SECTION 2 — FINANCIAL ENGINE MODULES

Create directory: `/lib/finance/brain/`.

## 2.1. `chart_of_accounts.ts`

Responsibilities:

* Provide common default COA templates
* Create default accounts for entities

```ts
import { supabaseAdmin } from '@/lib/supabase';

export interface AccountTemplate {
  name: string;
  code?: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  subtype?: string;
}

export function getDefaultAccountsForScope(
  scope: 'personal' | 'business' | 'household',
): AccountTemplate[] {
  if (scope === 'personal') {
    return [
      // Assets
      { name: 'Cash', type: 'asset', subtype: 'cash' },
      { name: 'Checking Account', type: 'asset', subtype: 'cash' },
      { name: 'Savings Account', type: 'asset', subtype: 'cash' },
      { name: 'Investments', type: 'asset', subtype: 'investment' },
      // Liabilities
      { name: 'Credit Card', type: 'liability', subtype: 'credit_card' },
      { name: 'Personal Loan', type: 'liability', subtype: 'loan' },
      // Income
      { name: 'Salary', type: 'income', subtype: 'salary' },
      { name: 'Other Income', type: 'income', subtype: 'other' },
      // Expenses
      { name: 'Housing', type: 'expense', subtype: 'housing' },
      { name: 'Food', type: 'expense', subtype: 'food' },
      { name: 'Transportation', type: 'expense', subtype: 'transportation' },
      { name: 'Utilities', type: 'expense', subtype: 'utilities' },
      { name: 'Entertainment', type: 'expense', subtype: 'entertainment' },
    ];
  }

  if (scope === 'business') {
    return [
      // Assets
      { name: 'Business Checking', type: 'asset', subtype: 'cash' },
      { name: 'Business Savings', type: 'asset', subtype: 'cash' },
      { name: 'Accounts Receivable', type: 'asset', subtype: 'receivable' },
      // Liabilities
      { name: 'Business Credit Card', type: 'liability', subtype: 'credit_card' },
      { name: 'Business Loan', type: 'liability', subtype: 'loan' },
      { name: 'Accounts Payable', type: 'liability', subtype: 'payable' },
      // Equity
      { name: 'Owner Equity', type: 'equity', subtype: 'owner' },
      // Income
      { name: 'Revenue', type: 'income', subtype: 'revenue' },
      // Expenses
      { name: 'Cost of Goods Sold', type: 'expense', subtype: 'cogs' },
      { name: 'Marketing', type: 'expense', subtype: 'marketing' },
      { name: 'Office Expenses', type: 'expense', subtype: 'office' },
      { name: 'Payroll', type: 'expense', subtype: 'payroll' },
    ];
  }

  if (scope === 'household') {
    return [
      // Assets
      { name: 'Household Checking', type: 'asset', subtype: 'cash' },
      { name: 'Household Savings', type: 'asset', subtype: 'cash' },
      // Liabilities
      { name: 'Household Credit Card', type: 'liability', subtype: 'credit_card' },
      { name: 'Mortgage', type: 'liability', subtype: 'loan' },
      // Income
      { name: 'Combined Income', type: 'income', subtype: 'combined' },
      // Expenses
      { name: 'Rent/Mortgage', type: 'expense', subtype: 'housing' },
      { name: 'Groceries', type: 'expense', subtype: 'food' },
      { name: 'Kids Expenses', type: 'expense', subtype: 'kids' },
      { name: 'Household Utilities', type: 'expense', subtype: 'utilities' },
    ];
  }

  return [];
}

export async function ensureDefaultAccounts(
  entityId: string,
  scope: 'personal' | 'business' | 'household',
): Promise<void> {
  // Check if accounts already exist
  const { data: existing } = await supabaseAdmin
    .from('financial_accounts')
    .select('id')
    .eq('entity_id', entityId)
    .limit(1);

  if (existing && existing.length > 0) {
    return; // Already has accounts
  }

  // Create default accounts
  const templates = getDefaultAccountsForScope(scope);
  const accounts = templates.map((t) => ({
    entity_id: entityId,
    name: t.name,
    code: t.code || null,
    type: t.type,
    subtype: t.subtype || null,
    is_active: true,
  }));

  const { error } = await supabaseAdmin.from('financial_accounts').insert(accounts);

  if (error) {
    console.error('[Finance] Failed to create default accounts', error);
    throw new Error('Failed to create default accounts');
  }
}
```

---

## 2.2. `ledger.ts`

Core ledger logic.

```ts
import { supabaseAdmin } from '@/lib/supabase';

export interface LedgerLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface LedgerEntry {
  entityId: string;
  eventDate: string; // ISO date string
  description: string;
  lines: LedgerLine[];
  source?: any;
}

export async function createLedgerEntry(entry: LedgerEntry): Promise<string> {
  // Validate: debits must equal credits
  const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error('Debits and credits must balance');
  }

  // Create entry
  const { data: entryRow, error: entryError } = await supabaseAdmin
    .from('financial_ledger_entries')
    .insert({
      entity_id: entry.entityId,
      event_date: entry.eventDate,
      description: entry.description,
      source: entry.source || {},
    })
    .select('id')
    .single();

  if (entryError || !entryRow) {
    throw new Error('Failed to create ledger entry');
  }

  // Create lines
  const lines = entry.lines.map((line) => ({
    entry_id: entryRow.id,
    account_id: line.accountId,
    debit: line.debit,
    credit: line.credit,
    memo: line.memo || null,
  }));

  const { error: linesError } = await supabaseAdmin.from('financial_ledger_lines').insert(lines);

  if (linesError) {
    throw new Error('Failed to create ledger lines');
  }

  return entryRow.id;
}

export async function getAccountBalances(
  entityId: string,
  asOfDate?: string,
): Promise<Record<string, number>> {
  const query = supabaseAdmin
    .from('financial_ledger_lines')
    .select(`
      account_id,
      debit,
      credit,
      financial_ledger_entries!inner (event_date, entity_id)
    `)
    .eq('financial_ledger_entries.entity_id', entityId);

  if (asOfDate) {
    query.lte('financial_ledger_entries.event_date', asOfDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Finance] Failed to get account balances', error);
    return {};
  }

  const balances: Record<string, number> = {};

  (data || []).forEach((line: any) => {
    const accountId = line.account_id;
    if (!balances[accountId]) {
      balances[accountId] = 0;
    }
    balances[accountId] += line.debit - line.credit;
  });

  return balances;
}

export interface FinancialSnapshot {
  netWorth: number;
  cashBalance: number;
  totalDebt: number;
  trailing30dIncome: number;
  trailing30dSpend: number;
}

export async function computeSnapshot(
  entityId: string,
  asOfDate: string = new Date().toISOString().split('T')[0],
): Promise<FinancialSnapshot> {
  const balances = await getAccountBalances(entityId, asOfDate);

  // Get account types
  const { data: accounts } = await supabaseAdmin
    .from('financial_accounts')
    .select('id, type')
    .eq('entity_id', entityId);

  const accountTypeMap = new Map(accounts?.map((a) => [a.id, a.type]) || []);

  let netWorth = 0;
  let cashBalance = 0;
  let totalDebt = 0;

  for (const [accountId, balance] of Object.entries(balances)) {
    const type = accountTypeMap.get(accountId);
    if (type === 'asset') {
      netWorth += balance;
      if (accountTypeMap.get(accountId) === 'asset') {
        // Check if it's cash-like
        cashBalance += balance;
      }
    } else if (type === 'liability') {
      netWorth -= balance;
      totalDebt += balance;
    }
  }

  // Compute trailing 30-day income & spend
  const thirtyDaysAgo = new Date(asOfDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: incomeLines } = await supabaseAdmin
    .from('financial_ledger_lines')
    .select(`
      debit,
      credit,
      financial_ledger_entries!inner (event_date, entity_id)
    `)
    .eq('financial_ledger_entries.entity_id', entityId)
    .gte('financial_ledger_entries.event_date', thirtyDaysAgo.toISOString().split('T')[0])
    .lte('financial_ledger_entries.event_date', asOfDate);

  let trailing30dIncome = 0;
  let trailing30dSpend = 0;

  (incomeLines || []).forEach((line: any) => {
    // Income accounts have credit balances
    if (line.credit > 0) {
      trailing30dIncome += line.credit;
    }
    // Expense accounts have debit balances
    if (line.debit > 0) {
      trailing30dSpend += line.debit;
    }
  });

  return {
    netWorth,
    cashBalance,
    totalDebt,
    trailing30dIncome,
    trailing30dSpend,
  };
}

export async function saveSnapshot(
  entityId: string,
  asOfDate: string,
  metrics: FinancialSnapshot,
): Promise<void> {
  const { error } = await supabaseAdmin.from('financial_snapshots').insert({
    entity_id: entityId,
    as_of_date: asOfDate,
    net_worth: metrics.netWorth,
    cash_balance: metrics.cashBalance,
    total_debt: metrics.totalDebt,
    trailing_30d_spend: metrics.trailing30dSpend,
    trailing_30d_income: metrics.trailing30dIncome,
    data: {},
  });

  if (error) {
    console.error('[Finance] Failed to save snapshot', error);
    throw new Error('Failed to save financial snapshot');
  }
}
```

---

## 2.3. `imports.ts`

Handles imported transactions.

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';
import { createLedgerEntry, LedgerLine } from './ledger';

export interface ImportedTransaction {
  rawId: string;
  postedAt: string;
  amount: number;
  description: string;
  currency?: string;
}

export async function importTransactions(
  connectionId: string,
  transactions: ImportedTransaction[],
): Promise<void> {
  for (const tx of transactions) {
    // Check if already imported
    const { data: existing } = await supabaseAdmin
      .from('financial_imported_transactions')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('raw_id', tx.rawId)
      .maybeSingle();

    if (existing) {
      continue; // Already imported
    }

    // Insert
    await supabaseAdmin.from('financial_imported_transactions').insert({
      connection_id: connectionId,
      raw_id: tx.rawId,
      posted_at: tx.postedAt,
      amount: tx.amount,
      currency: tx.currency || 'USD',
      description: tx.description,
      raw: {},
    });
  }
}

export interface SuggestedLedgerEntry {
  transactionId: string;
  description: string;
  lines: LedgerLine[];
  confidence: number;
}

export async function suggestLedgerEntriesForImports(
  entityId: string,
  connectionId: string,
): Promise<SuggestedLedgerEntry[]> {
  // Get unreconciled transactions
  const { data: transactions } = await supabaseAdmin
    .from('financial_imported_transactions')
    .select('*')
    .eq('connection_id', connectionId)
    .is('ledger_entry_id', null)
    .order('posted_at', { ascending: false })
    .limit(50);

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Get accounts for this entity
  const { data: accounts } = await supabaseAdmin
    .from('financial_accounts')
    .select('id, name, type, subtype')
    .eq('entity_id', entityId)
    .eq('is_active', true);

  const suggestions: SuggestedLedgerEntry[] = [];

  for (const tx of transactions) {
    // Use LLM to suggest categorization
    const systemPrompt = `You are a financial categorization assistant. Given a transaction description and amount, suggest which accounts to debit and credit. Use double-entry accounting principles.`;

    const userPrompt = `Transaction: ${tx.description}
Amount: ${tx.amount > 0 ? `+$${Math.abs(tx.amount)}` : `-$${Math.abs(tx.amount)}`}
Date: ${tx.posted_at}

Available accounts:
${accounts?.map((a) => `- ${a.name} (${a.type}/${a.subtype})`).join('\n')}

Suggest a ledger entry with:
1. Description
2. Debit account (if amount is negative, this is likely an expense)
3. Credit account (if amount is positive, this is likely income; if negative, likely cash/asset)
4. Confidence (0-1)

Respond with JSON only.`;

    const result = await callAI({
      userId: 'system',
      model: 'gpt-4o-mini',
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 300,
      feature: 'finance_categorization',
    });

    if (result.success && result.content) {
      try {
        const parsed = JSON.parse(result.content);
        suggestions.push({
          transactionId: tx.id,
          description: parsed.description || tx.description,
          lines: parsed.lines || [],
          confidence: parsed.confidence || 0.5,
        });
      } catch {
        // Fallback
        suggestions.push({
          transactionId: tx.id,
          description: tx.description,
          lines: [],
          confidence: 0.3,
        });
      }
    }
  }

  return suggestions;
}
```

---

## 2.4. `budget_engine.ts`

Handles budgets & envelopes.

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { getAccountBalances } from './ledger';

export interface BudgetEnvelope {
  name: string;
  accountId?: string;
  targetAmount: number;
}

export interface BudgetStatus {
  envelopeId: string;
  name: string;
  target: number;
  actual: number;
  remaining: number;
}

export async function createBudget(
  entityId: string,
  name: string,
  period: 'monthly' | 'weekly' | 'custom',
  startDate?: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('financial_budgets')
    .insert({
      entity_id: entityId,
      name,
      period,
      start_date: startDate || new Date().toISOString().split('T')[0],
      end_date: null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create budget');
  }

  return data.id;
}

export async function setBudgetEnvelopes(
  budgetId: string,
  envelopes: BudgetEnvelope[],
): Promise<void> {
  // Delete existing
  await supabaseAdmin.from('financial_budget_envelopes').delete().eq('budget_id', budgetId);

  // Insert new
  const rows = envelopes.map((e) => ({
    budget_id: budgetId,
    name: e.name,
    account_id: e.accountId || null,
    target_amount: e.targetAmount,
  }));

  const { error } = await supabaseAdmin.from('financial_budget_envelopes').insert(rows);

  if (error) {
    throw new Error('Failed to set budget envelopes');
  }
}

export async function computeBudgetStatus(
  budgetId: string,
  asOfDate: string = new Date().toISOString().split('T')[0],
): Promise<BudgetStatus[]> {
  // Get budget
  const { data: budget } = await supabaseAdmin
    .from('financial_budgets')
    .select('entity_id, start_date, period')
    .eq('id', budgetId)
    .single();

  if (!budget) {
    throw new Error('Budget not found');
  }

  // Get envelopes
  const { data: envelopes } = await supabaseAdmin
    .from('financial_budget_envelopes')
    .select('*')
    .eq('budget_id', budgetId);

  // Get account balances for period
  const periodStart = budget.start_date || asOfDate;
  const balances = await getAccountBalances(budget.entity_id, asOfDate);

  const statuses: BudgetStatus[] = [];

  for (const envelope of envelopes || []) {
    const target = envelope.target_amount;
    let actual = 0;

    if (envelope.account_id) {
      // Use account balance if linked
      actual = Math.abs(balances[envelope.account_id] || 0);
    } else {
      // For v1, use simple heuristic: assume expense account with matching name
      // In production, you'd do more sophisticated matching
      actual = 0; // Placeholder
    }

    statuses.push({
      envelopeId: envelope.id,
      name: envelope.name,
      target,
      actual,
      remaining: target - actual,
    });
  }

  return statuses;
}
```

---

## 2.5. `forecasting.ts`

Implements basic cashflow forecasting.

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { getAccountBalances, computeSnapshot } from './ledger';

export interface CashflowForecast {
  entityId: string;
  horizonDays: number;
  daily: {
    date: string;
    projectedBalance: number;
  }[];
  risks: string[];
}

export async function forecastCashflow(
  entityId: string,
  horizonDays: number = 30,
): Promise<CashflowForecast> {
  const today = new Date();
  const snapshot = await computeSnapshot(entityId);

  // Get historical daily net (simplified: average over last 30 days)
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: entries } = await supabaseAdmin
    .from('financial_ledger_entries')
    .select('event_date')
    .eq('entity_id', entityId)
    .gte('event_date', thirtyDaysAgo.toISOString().split('T')[0])
    .lte('event_date', today.toISOString().split('T')[0]);

  // Simple model: average daily net
  const avgDailyNet = (snapshot.trailing30dIncome - snapshot.trailing30dSpend) / 30;

  const daily: { date: string; projectedBalance: number }[] = [];
  let currentBalance = snapshot.cashBalance;
  const risks: string[] = [];

  for (let i = 0; i <= horizonDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Project forward
    currentBalance += avgDailyNet;

    daily.push({
      date: dateStr,
      projectedBalance: currentBalance,
    });

    // Flag risks
    if (currentBalance < 0 && risks.length === 0) {
      risks.push(`Projected cash negative on ${dateStr}`);
    }
  }

  // Additional risk checks
  if (currentBalance < snapshot.cashBalance * 0.5) {
    risks.push('Cash balance projected to drop below 50% of current');
  }

  return {
    entityId,
    horizonDays,
    daily,
    risks,
  };
}
```

---

# SECTION 3 — AGI INTEGRATION

## 3.1. WorldState Extensions

Update `lib/agi/worldstate.ts`:

```ts
// Add to WorldState interface
export interface WorldState {
  // ... existing fields ...
  finances: {
    cashflowSummary?: {
      netWorth?: number;
      cashBalance?: number;
      totalDebt?: number;
      trailing30dIncome?: number;
      trailing30dSpend?: number;
    };
    upcomingBills?: any[];
    anomalies?: any[];
    budgets?: {
      activeBudgetId?: string;
      envelopes?: {
        name: string;
        target: number;
        actual: number;
      }[];
    };
    forecast?: {
      riskFlags: string[];
      projectedRunwayDays?: number;
      possibleNegativeDate?: string | null;
    };
  };
}

// In buildWorldState function, add:
import { getFinancialEntities } from '@/lib/finance/brain/entities';
import { computeSnapshot } from '@/lib/finance/brain/ledger';
import { computeBudgetStatus } from '@/lib/finance/brain/budget_engine';
import { forecastCashflow } from '@/lib/finance/brain/forecasting';

// Inside buildWorldState:
const entities = await getFinancialEntities(userId);
if (entities.length > 0) {
  const primaryEntity = entities[0];
  const snapshot = await computeSnapshot(primaryEntity.id);
  const forecast = await forecastCashflow(primaryEntity.id, 30);

  // Get active budget
  const { data: activeBudget } = await supabaseAdmin
    .from('financial_budgets')
    .select('id')
    .eq('entity_id', primaryEntity.id)
    .limit(1)
    .maybeSingle();

  let budgetEnvelopes: any[] = [];
  if (activeBudget) {
    const status = await computeBudgetStatus(activeBudget.id);
    budgetEnvelopes = status;
  }

  world.finances = {
    cashflowSummary: {
      netWorth: snapshot.netWorth,
      cashBalance: snapshot.cashBalance,
      totalDebt: snapshot.totalDebt,
      trailing30dIncome: snapshot.trailing30dIncome,
      trailing30dSpend: snapshot.trailing30dSpend,
    },
    budgets: {
      activeBudgetId: activeBudget?.id,
      envelopes: budgetEnvelopes,
    },
    forecast: {
      riskFlags: forecast.risks,
      possibleNegativeDate: forecast.risks.find((r) => r.includes('negative'))
        ? forecast.daily.find((d) => d.projectedBalance < 0)?.date || null
        : null,
    },
  };
}
```

---

## 3.2. FinanceAgent v2

Enhance or create `lib/agi/agents/financeAgent.ts`:

```ts
import { Agent, makeAgentResult } from '../agents';
import { AgentContext, AGIAction } from '../types';

export const financeAgent: Agent = {
  name: 'FinanceAgent',
  description: 'Detects cashflow issues, budget overshoots, and financial risks. Proposes budgeting and planning actions.',
  domains: ['finance'],
  priority: 85,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const world: any = ctx.world;
    const finances = world.finances;

    if (!finances || !finances.cashflowSummary) {
      return makeAgentResult(
        'FinanceAgent',
        'No financial data available.',
        [],
        0.1,
      );
    }

    const { cashflowSummary, budgets, forecast } = finances;

    // Check for cash crunch
    if (forecast?.riskFlags && forecast.riskFlags.length > 0) {
      actions.push({
        type: 'log_insight',
        label: `Cashflow risk detected: ${forecast.riskFlags[0]}`,
        details: {
          domain: 'finance',
          scope: 'cashflow',
          risks: forecast.riskFlags,
          subsource: 'finance_agent',
        },
        requiresConfirmation: false,
        riskLevel: 'medium',
      });
    }

    // Check budget overshoot
    if (budgets?.envelopes) {
      const overshoots = budgets.envelopes.filter(
        (e: any) => e.actual > e.target && e.remaining < 0,
      );

      if (overshoots.length > 0) {
        actions.push({
          type: 'nudge_user',
          label: `Budget overshoot: ${overshoots.map((e: any) => e.name).join(', ')}`,
          details: {
            message: `You're overspending in ${overshoots.length} budget envelope(s). Consider reviewing your spending.`,
            domain: 'finance',
            subsource: 'finance_agent',
          },
          requiresConfirmation: false,
          riskLevel: 'low',
        });
      }
    }

    // High debt service
    const debtToIncomeRatio = cashflowSummary.totalDebt
      ? cashflowSummary.totalDebt / Math.max(cashflowSummary.trailing30dIncome, 1)
      : 0;

    if (debtToIncomeRatio > 0.5) {
      actions.push({
        type: 'nudge_user',
        label: 'High debt-to-income ratio',
        details: {
          message: `Your debt-to-income ratio is ${(debtToIncomeRatio * 100).toFixed(0)}%. Consider a debt reduction plan.`,
          domain: 'finance',
          subsource: 'finance_agent',
        },
        requiresConfirmation: false,
        riskLevel: 'medium',
      });
    }

    // Suggest budgeting session
    if (!budgets?.activeBudgetId) {
      actions.push({
        type: 'create_task',
        label: 'Set up a budget',
        details: {
          title: 'Create monthly budget',
          description: 'Pulse can help you set up a budget with envelopes for better financial planning.',
          domain: 'finance',
          subsource: 'finance_agent',
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    const reasoning = `Analyzed financial snapshot. Found ${forecast?.riskFlags?.length || 0} risk(s) and ${overshoots?.length || 0} budget overshoot(s).`;

    return makeAgentResult('FinanceAgent', reasoning, actions, 0.8);
  },
};
```

---

# SECTION 4 — API LAYER

## 4.1. Entity & Account Management

`app/api/finance/entities/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ensureDefaultAccounts } from '@/lib/finance/brain/chart_of_accounts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);

    const { data, error } = await supabaseAdmin
      .from('financial_entities')
      .select('*')
      .eq('user_id', dbUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entities: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { scope, name, description } = body;

    if (!scope || !name) {
      return NextResponse.json({ error: 'scope and name are required' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    const { data: entity, error } = await supabaseAdmin
      .from('financial_entities')
      .insert({
        user_id: dbUserId,
        scope,
        name,
        description: description || null,
      })
      .select('id')
      .single();

    if (error || !entity) {
      return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 });
    }

    // Create default accounts
    await ensureDefaultAccounts(entity.id, scope as any);

    return NextResponse.json({ entityId: entity.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 4.2. Ledger & Imports APIs

`app/api/finance/ledger/entry/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLedgerEntry } from '@/lib/finance/brain/ledger';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { entityId, eventDate, description, lines } = body;

    if (!entityId || !eventDate || !lines || !Array.isArray(lines)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const entryId = await createLedgerEntry({
      entityId,
      eventDate,
      description,
      lines,
    });

    return NextResponse.json({ entryId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

`app/api/finance/imports/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { importTransactions } from '@/lib/finance/brain/imports';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { connectionId, transactions } = body;

    if (!connectionId || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await importTransactions(connectionId, transactions);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 4.3. Budget & Forecast APIs

`app/api/finance/budgets/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createBudget, setBudgetEnvelopes } from '@/lib/finance/brain/budget_engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { entityId, name, period, startDate } = body;

    if (!entityId || !name || !period) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const budgetId = await createBudget(entityId, name, period, startDate);

    if (body.envelopes && Array.isArray(body.envelopes)) {
      await setBudgetEnvelopes(budgetId, body.envelopes);
    }

    return NextResponse.json({ budgetId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

`app/api/finance/forecast/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { forecastCashflow } from '@/lib/finance/brain/forecasting';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const entityId = searchParams.get('entityId');
    const horizonDays = parseInt(searchParams.get('horizonDays') || '30', 10);

    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    const forecast = await forecastCashflow(entityId, horizonDays);

    return NextResponse.json(forecast);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

# SECTION 5 — UI: FINANCIAL BRAIN DASHBOARD

Create: `app/(authenticated)/finance/brain/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AppCard } from '@/components/ui/AppCard';
import { Button } from '@/components/ui/button';

export default function FinancialBrainPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    if (selectedEntity) {
      fetchSnapshot();
      fetchForecast();
      fetchBudget();
    }
  }, [selectedEntity]);

  async function fetchEntities() {
    const res = await fetch('/api/finance/entities');
    if (res.ok) {
      const data = await res.json();
      setEntities(data.entities || []);
      if (data.entities && data.entities.length > 0) {
        setSelectedEntity(data.entities[0].id);
      }
    }
  }

  async function fetchSnapshot() {
    // TODO: Implement snapshot API
  }

  async function fetchForecast() {
    if (!selectedEntity) return;
    const res = await fetch(`/api/finance/forecast?entityId=${selectedEntity}&horizonDays=30`);
    if (res.ok) {
      const data = await res.json();
      setForecast(data);
    }
  }

  async function fetchBudget() {
    // TODO: Implement budget API
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Financial Brain</h1>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Entity</h2>
        <select
          value={selectedEntity || ''}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="bg-black/30 text-white p-2 rounded"
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.scope})
            </option>
          ))}
        </select>
      </AppCard>

      {snapshot && (
        <AppCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Snapshot</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/60 text-sm">Net Worth</div>
              <div className="text-white text-2xl">
                ${snapshot.netWorth?.toLocaleString() || '0'}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Cash Balance</div>
              <div className="text-white text-2xl">
                ${snapshot.cashBalance?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        </AppCard>
      )}

      {forecast && (
        <AppCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">30-Day Forecast</h2>
          {forecast.risks.length > 0 && (
            <div className="mb-4">
              <h3 className="text-white font-medium mb-2">Risks:</h3>
              <ul className="list-disc list-inside text-white/80">
                {forecast.risks.map((risk: string, i: number) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </AppCard>
      )}
    </div>
  );
}
```

---

# SECTION 6 — VOICE & COACHING INTEGRATION

## 6.1. Voice Intents

Update `lib/voice/intent_detector.ts`:

```ts
// Add finance detection
if (
  lowerText.includes('financ') ||
  lowerText.includes('budget') ||
  lowerText.includes('cashflow') ||
  lowerText.includes('afford')
) {
  return {
    route: 'finance',
    financeIntent: extractFinanceIntent(text),
  };
}
```

## 6.2. Voice Finance Route

Create: `lib/voice/routes/finance.ts`

```ts
import { VoiceRouteResult } from '../router';
import { computeSnapshot, forecastCashflow } from '@/lib/finance/brain/ledger';
import { getFinancialEntities } from '@/lib/finance/brain/entities';

export async function handleFinanceVoiceTurn(params: {
  userId: string;
  sessionId: string;
  text: string;
  intent: any;
}): Promise<VoiceRouteResult> {
  const entities = await getFinancialEntities(params.userId);
  if (entities.length === 0) {
    return {
      route: 'finance',
      text: "You don't have any financial entities set up yet. Go to Financial Brain to create one.",
    };
  }

  const primaryEntity = entities[0];
  const snapshot = await computeSnapshot(primaryEntity.id);

  if (params.intent.financeIntent === 'status') {
    return {
      route: 'finance',
      text: `Your current cash balance is $${snapshot.cashBalance.toLocaleString()}, and your net worth is $${snapshot.netWorth.toLocaleString()}.`,
    };
  }

  if (params.intent.financeIntent === 'forecast') {
    const forecast = await forecastCashflow(primaryEntity.id, 30);
    if (forecast.risks.length > 0) {
      return {
        route: 'finance',
        text: `Your 30-day forecast shows: ${forecast.risks[0]}. Check your Financial Brain dashboard for details.`,
      };
    }
    return {
      route: 'finance',
      text: 'Your 30-day cashflow forecast looks stable. No major risks detected.',
    };
  }

  return {
    route: 'finance',
    text: "I can help you with financial status, forecasts, and budgets. Try asking 'How am I doing financially?'",
  };
}
```

---

# SECTION 7 — ACCEPTANCE CRITERIA

Phase 15 is **complete** when:

### ✅ Core Data & Engine

1. `financial_entities`, `financial_accounts`, `financial_ledger_entries`, `financial_ledger_lines` are live and populated for at least:
   * One personal entity
   * One business entity
   * (Optional) one household entity

2. `ensureDefaultAccounts` creates a functional chart of accounts.

3. `computeSnapshot` + `saveSnapshot` produce meaningful snapshots.

### ✅ Budget & Forecast

1. A user can:
   * Create a budget with envelopes
   * See target vs actual per envelope

2. `forecastCashflow`:
   * Generates a 30-day projection
   * Flags at least one "risk" condition in a test scenario (e.g., negative cash).

### ✅ AGI & Voice

1. FinanceAgent:
   * Appears in AGI runs
   * Produces finance-flavored actions like:
     * "Schedule budgeting session."
     * "You're overspending vs your baseline."

2. Voice:
   * User can say:
     * "How am I doing financially?" → Get snapshot answer.
     * "Help me build a budget." → Kick off budget setup flow (or guide to UI).

### ✅ UI

1. `/finance/brain`:
   * Shows overview cards, budget section, forecast, and AGI suggestions.

2. Entity-specific pages:
   * Ledger view
   * Imports view
   * Budget editor

3. All pages are mobile-friendly enough to use within the web shell / app shell.

### ✅ Safety

1. No endpoints perform external transfers or trading.

2. Wording clearly avoids "guaranteed financial advice" framing; it's coaching and planning assistance.

3. High-risk finance actions (e.g., suggesting radical budget changes) are presented as **suggestions** requiring user involvement.

---

**End of spec.**


