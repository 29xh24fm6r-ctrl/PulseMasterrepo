// Finance Types
// lib/finance/types.ts

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

export interface FinanceAlert {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  severity: number;
  is_positive: boolean;
  created_at: string;
  seen_at?: string;
  dismissed_at?: string;
}

export interface FinanceCoachContext {
  summary: {
    incomeThisMonth: number;
    expensesThisMonth: number;
    netCashflowThisMonth: number;
  };
  budgets: BudgetVsActual[];
  goals: Array<{
    name: string;
    type: string;
    targetAmount?: number;
    currentAmount?: number;
    percentComplete?: number;
    deadline?: string;
  }>;
  alerts: Array<{
    type: string;
    title: string;
    body: string;
    severity: number;
    isPositive: boolean;
  }>;
}




