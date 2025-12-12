// Finance Agent - Cashflow, bills, financial health
// lib/agi/agents/financeAgent.ts

import { Agent, makeAgentResult } from "../agents";
import { AgentContext, AGIAction } from "../types";

export const financeAgent: Agent = {
  name: "FinanceAgent",
  description: "Monitors cashflow, upcoming bills, and financial anomalies.",
  priority: 60,

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const { world } = ctx;

    // Use finance perception data
    const upcomingBills = world.finances.upcomingBills || [];
    const anomalies = world.finances.anomalies || [];
    const spendingDrift = world.finances.spendingDrift || 0;
    const stressSignals = world.finances.stressSignals || [];

    const billsDueSoon = upcomingBills.filter((b: any) => {
      if (!b.dueDate) return false;
      const daysUntil = Math.floor(
        (new Date(b.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 7;
    });

    if (billsDueSoon.length > 0) {
      const totalAmount = billsDueSoon.reduce((sum: number, b: any) => sum + (parseFloat(b.amount || b.amount) || 0), 0);
      actions.push({
        type: "create_task",
        label: `Review ${billsDueSoon.length} upcoming bill${billsDueSoon.length > 1 ? "s" : ""}`,
        details: {
          title: "Upcoming bills review",
          when: "this_week",
          domain: "finance",
          metadata: { bills: billsDueSoon, totalAmount },
        },
        requiresConfirmation: false,
        riskLevel: stressSignals.includes("high_bill_load") ? "medium" : "low",
      });
    }

    // Financial anomalies
    if (anomalies.length > 0) {
      const highSeverityAnomalies = anomalies.filter((a: any) => a.severity === "high");
      actions.push({
        type: "log_insight",
        label: `Review ${anomalies.length} financial anomaly${anomalies.length > 1 ? "ies" : ""}`,
        details: {
          insight: `${anomalies.length} financial anomaly/anomalies detected${highSeverityAnomalies.length > 0 ? ` (${highSeverityAnomalies.length} high severity)` : ""}. Review transactions and cashflow.`,
          priority: highSeverityAnomalies.length > 0 ? "high" : "medium",
          domain: "finance",
        },
        requiresConfirmation: true,
        riskLevel: highSeverityAnomalies.length > 0 ? "high" : "medium",
      });
    }

    // Spending drift warning
    if (spendingDrift > 0.3) {
      actions.push({
        type: "log_insight",
        label: "Spending has increased significantly",
        details: {
          insight: `Your spending has increased ${Math.round(spendingDrift * 100)}% compared to recent patterns. Review if this aligns with your financial goals.`,
          priority: "medium",
          domain: "finance",
        },
        requiresConfirmation: false,
        riskLevel: "low",
      });
    }

    // Stress signals
    if (stressSignals.length > 0) {
      const signalMessages: Record<string, string> = {
        high_bill_load: "High bill load detected - consider reviewing budget",
        spending_increase: "Spending increase detected - monitor cashflow",
        financial_anomalies: "Financial anomalies detected - review transactions",
      };

      for (const signal of stressSignals) {
        if (signalMessages[signal]) {
          actions.push({
            type: "log_insight",
            label: signalMessages[signal],
            details: {
              insight: signalMessages[signal],
              priority: "high",
              domain: "finance",
            },
            requiresConfirmation: false,
            riskLevel: "low",
          });
        }
      }
    }

    const reasoning =
      billsDueSoon.length > 0
        ? `${billsDueSoon.length} bill(s) due in the next 7 days.`
        : anomalies.length > 0
        ? `${anomalies.length} financial anomaly/anomalies detected.`
        : spendingDrift > 0.3
        ? `Spending drift detected (${Math.round(spendingDrift * 100)}% increase).`
        : stressSignals.length > 0
        ? `${stressSignals.length} financial stress signal(s) detected.`
        : "Financial status is stable.";

    const confidence = billsDueSoon.length > 0 ? 0.8 : anomalies.length > 0 ? 0.9 : spendingDrift > 0.3 ? 0.7 : stressSignals.length > 0 ? 0.8 : 0.4;

    return makeAgentResult("FinanceAgent", reasoning, actions, confidence);
  },
};

