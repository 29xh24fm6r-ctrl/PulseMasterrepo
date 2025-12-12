// Finance Domain Autonomy Policies v3
// lib/cortex/autonomy/policies/finance-policies.ts

import { registerPolicy, AutonomyPolicy, AutonomyAction } from "../v3";
import { PulseCortexContext } from "../../types";
import { PulseCortexContext } from "../../types";

/**
 * Policy: Financial Stress Window Detection
 */
const financialStressWindowPolicy: AutonomyPolicy = {
  id: "finance:stress_window",
  domain: "finance",
  name: "Financial Stress Window Detection",
  description: "Detect financial stress patterns from longitudinal model",
  priority: 15,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    const stressPatterns = ctx.longitudinal.aggregatedPatterns.filter(
      (p) => p.type === "financial_stress_window"
    );

    if (stressPatterns.length > 0) {
      const recentPattern = stressPatterns[0];
      const isActive =
        !recentPattern.endDate || new Date(recentPattern.endDate) > new Date();

      if (isActive && recentPattern.strength > 0.6) {
        actions.push({
          id: "financial_stress_alert",
          domain: "finance",
          title: "⚠️ Financial Stress Window",
          description: "Historical patterns indicate financial stress. Review cashflow and obligations.",
          severity: "warning",
          requiresConfirmation: true,
          payload: {
            type: "financial_stress_alert",
            suggestedAction: "review_finances",
            patternStrength: recentPattern.strength,
          },
          metadata: {
            patternId: recentPattern.id,
            patternDescription: recentPattern.description,
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Policy: Cashflow Crunch Early Warning
 */
const cashflowCrunchPolicy: AutonomyPolicy = {
  id: "finance:cashflow_crunch",
  domain: "finance",
  name: "Cashflow Crunch Early Warning",
  description: "Early warning for potential cashflow problems",
  priority: 18,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.finance?.cashflowProjection) return actions;

    if (ctx.domains.finance.cashflowProjection.trend === "negative") {
      actions.push({
        id: "cashflow_warning",
        domain: "finance",
        title: "⚠️ Cashflow Warning",
        description: "Projected negative cashflow in next 30 days",
        severity: "urgent",
        requiresConfirmation: true,
        payload: {
          type: "cashflow_alert",
          suggestedAction: "review_finances",
          urgency: "high",
        },
        metadata: {
          projection: ctx.domains.finance.cashflowProjection.next30Days,
        },
      });
    }

    return actions;
  },
};

// Register all policies
registerPolicy(financialStressWindowPolicy);
registerPolicy(cashflowCrunchPolicy);

