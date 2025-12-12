-- Financial Intelligence Engine v1 - Money Brain & Financial Coach
-- supabase/migrations/20251211_financial_intelligence_engine_v1.sql

-- 1.1 Finance Accounts
CREATE TABLE IF NOT EXISTS finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,               -- 'checking', 'savings', 'credit_card', 'loan', 'investment', 'cash', 'business'
  institution text,                 -- optional: 'Chase', 'Amex', 'OGB', etc.
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  balance numeric(14,2) DEFAULT 0.00,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_accounts_user_idx
  ON finance_accounts(user_id, is_active);

-- 1.2 Finance Transactions
CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text,
  amount numeric(14,2) NOT NULL,      -- positive for inflow, negative for outflow
  category text,                      -- high-level: 'income', 'housing', 'food', 'transport', 'debt', etc.
  subcategory text,
  is_transfer boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_transactions_user_idx
  ON finance_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS finance_transactions_account_idx
  ON finance_transactions(account_id, date DESC);

-- 1.3 Finance Budgets
CREATE TABLE IF NOT EXISTS finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,                 -- use first day of month
  category text NOT NULL,
  amount numeric(14,2) NOT NULL,       -- planned spend (or income) for that category
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, month, category)
);

CREATE INDEX IF NOT EXISTS finance_budgets_user_idx
  ON finance_budgets(user_id, month DESC);

-- 1.4 Finance Goals
CREATE TABLE IF NOT EXISTS finance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,                  -- 'Emergency fund 3 months', 'Pay off credit card', etc.
  type text NOT NULL,                  -- 'savings', 'debt_paydown', 'income_target', 'spending_cut'
  target_amount numeric(14,2),
  current_amount numeric(14,2) DEFAULT 0.00,
  deadline date,
  linked_account_id uuid REFERENCES finance_accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',   -- 'active', 'paused', 'completed'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_goals_user_idx
  ON finance_goals(user_id, status);

-- 1.5 Finance Snapshots
CREATE TABLE IF NOT EXISTS finance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,          -- e.g. first of month, or week start
  period_type text NOT NULL,           -- 'month', 'week'
  income numeric(14,2) DEFAULT 0.00,
  expenses numeric(14,2) DEFAULT 0.00,
  savings numeric(14,2) DEFAULT 0.00,
  debt_paydown numeric(14,2) DEFAULT 0.00,
  net_cashflow numeric(14,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, period_start, period_type)
);

CREATE INDEX IF NOT EXISTS finance_snapshots_user_idx
  ON finance_snapshots(user_id, period_start DESC);

-- 1.6 Finance Alerts
CREATE TABLE IF NOT EXISTS finance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,                 -- 'overspend', 'runway_risk', 'goal_progress', 'positive_trend'
  title text NOT NULL,
  body text NOT NULL,
  severity int DEFAULT 1,             -- 1–5
  is_positive boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  seen_at timestamptz,
  dismissed_at timestamptz
);

CREATE INDEX IF NOT EXISTS finance_alerts_user_idx
  ON finance_alerts(user_id, created_at DESC);




