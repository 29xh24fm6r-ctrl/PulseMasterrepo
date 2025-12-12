// Financial Coach Helpers
// lib/finance/coach.ts

import { getFinanceOverview } from "./api";
import { getUserGoals } from "./goals";
import { getBudgetVsActualForMonth } from "./budgets";
import { FinanceCoachContext } from "./types";

/**
 * Build financial context for coach prompts (returns structured context)
 */
export async function buildFinancialCoachContextStructured(userId: string): Promise<FinanceCoachContext> {
  const overview = await getFinanceOverview(userId);
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const monthStr = currentMonth.toISOString().split("T")[0];
  const budgets = await getBudgetVsActualForMonth(userId, monthStr);
  const goals = await getUserGoals(userId);

  return {
    summary: {
      incomeThisMonth: overview.currentMonth.income,
      expensesThisMonth: overview.currentMonth.expenses,
      netCashflowThisMonth: overview.currentMonth.netCashflow,
    },
    budgets,
    goals: goals.map((g) => ({
      name: g.name,
      type: g.type,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      percentComplete: g.target_amount ? (g.current_amount / g.target_amount) * 100 : undefined,
      deadline: g.deadline,
    })),
    alerts: overview.alerts.map((a: any) => ({
      type: a.type,
      title: a.title,
      body: a.body,
      severity: a.severity,
      isPositive: a.is_positive,
    })),
  };
}

/**
 * Build financial context for coach prompts (returns string)
 */
export async function buildFinancialCoachContext(userId: string): Promise<string> {
  const overview = await getFinanceOverview(userId);
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const monthStr = currentMonth.toISOString().split("T")[0];
  const budgets = await getBudgetVsActualForMonth(userId, monthStr);

  let context = `User's Financial Context:\n\n`;

  // Current month summary
  context += `Current Month:\n`;
  context += `- Income: $${overview.currentMonth.income.toFixed(2)}\n`;
  context += `- Expenses: $${overview.currentMonth.expenses.toFixed(2)}\n`;
  context += `- Net Cashflow: $${overview.currentMonth.netCashflow.toFixed(2)}\n\n`;

  // Accounts
  if (overview.accounts.length > 0) {
    context += `Accounts:\n`;
    for (const account of overview.accounts.slice(0, 5)) {
      context += `- ${account.name} (${account.type}): $${account.balance.toFixed(2)}\n`;
    }
    context += `\n`;
  }

  // Budget status
  if (budgets.length > 0) {
    context += `Budget Status:\n`;
    for (const budget of budgets.slice(0, 5)) {
      const status = budget.percentUsed > 100 ? "over" : budget.percentUsed > 80 ? "near limit" : "on track";
      context += `- ${budget.category}: ${status} (${budget.percentUsed.toFixed(0)}% used)\n`;
    }
    context += `\n`;
  }

  // Goals
  if (overview.goals.length > 0) {
    context += `Active Goals:\n`;
    for (const goal of overview.goals.slice(0, 5)) {
      const percent = goal.target_amount
        ? ((goal.current_amount / goal.target_amount) * 100).toFixed(0)
        : "N/A";
      context += `- ${goal.name}: ${percent}% complete\n`;
    }
    context += `\n`;
  }

  // Alerts
  if (overview.alerts.length > 0) {
    context += `Recent Alerts:\n`;
    for (const alert of overview.alerts.slice(0, 3)) {
      context += `- ${alert.title}: ${alert.body}\n`;
    }
  }

  return context;
}

/**
 * Financial coach system prompt additions
 */
export function getFinancialCoachSystemPrompt(): string {
  return `You are the Pulse Financial Coach. Your role is to help users understand their money, set realistic goals, and make informed decisions.

Key principles:
- Use safe, non-judgmental language (e.g., "may be helpful", "might consider", "tends to be safer")
- Never shame or lecture
- Make clear that you are not a certified financial advisor
- Provide general guidance based on patterns, not guarantees
- Help users understand tradeoffs (e.g., "If you keep this spending pattern, you may delay goal X by Y months")
- Use frameworks like Dave Ramsey's clarity without the shame
- Focus on actionable, realistic steps
- Avoid individualized investment/security recommendations
- Encourage consultation with qualified professionals for high-stakes decisions

When discussing budgets, goals, or spending:
- Acknowledge progress and wins
- Suggest adjustments gently
- Explain the "why" behind recommendations
- Help users prioritize based on their Life Arcs and Strategy
- Use probabilistic language: "may", "might", "could", "tends to"
- Never guarantee financial outcomes
- Avoid fear tactics and shame`;
}

/**
 * Get Financial Coach persona profile
 */
export function getFinancialCoachPersonaProfile(): any {
  return {
    id: "financial_coach",
    key: "financial_coach",
    name: "Financial Coach",
    description: "A calm, clear, encouraging financial guide who helps you understand your money without judgment",
    style: {
      energy: 50,
      warmth: 70,
      pacing: "normal",
      sentence_length: "medium",
      decisiveness: 60,
      humor: 20,
      metaphor_density: 30,
      rhetorical_intensity: 30,
      directiveness: 50,
      emotional_reflection: 40,
      phrasing_patterns: [],
    },
  };
}

