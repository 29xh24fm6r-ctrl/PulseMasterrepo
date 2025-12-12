// Choice Modeling for Simulation Engine v3
// lib/simulation/v3/choice-modeling.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { SimulationScenarioV3, ScenarioResultV3 } from "./types";
import { IdentityArchetype } from "@/lib/identity/v3/types";

/**
 * Model the impact of a choice on future trajectory
 */
export function modelChoiceImpact(
  choice: SimulationScenarioV3["choiceModeling"],
  baseContext: PulseCortexContext,
  horizonDays: number
): Partial<ScenarioResultV3> {
  if (!choice) return {};

  const impact: Partial<ScenarioResultV3> = {
    identityProjections: [],
    relationshipProjections: [],
    financialProjections: [],
    predictedArcs: [],
  };

  switch (choice.type) {
    case "archetype_shift":
      impact.identityProjections = modelArchetypeShift(
        choice.parameters.targetArchetype as IdentityArchetype,
        baseContext,
        horizonDays
      );
      break;

    case "relationship_decision":
      impact.relationshipProjections = modelRelationshipDecision(
        choice.parameters,
        baseContext,
        horizonDays
      );
      break;

    case "career_path":
      impact.predictedArcs = modelCareerPath(choice.parameters, baseContext, horizonDays);
      break;

    case "financial_decision":
      impact.financialProjections = modelFinancialDecision(
        choice.parameters,
        baseContext,
        horizonDays
      );
      break;
  }

  return impact;
}

/**
 * Model archetype shift impact
 */
function modelArchetypeShift(
  targetArchetype: IdentityArchetype,
  ctx: PulseCortexContext,
  horizonDays: number
): ScenarioResultV3["identityProjections"] {
  // Estimate transition probability based on current state
  const currentArchetype = "strategist"; // Would come from identity profile
  const transitionProbability = currentArchetype === targetArchetype ? 1.0 : 0.6;

  return [
    {
      currentArchetype: currentArchetype as IdentityArchetype,
      projectedArchetype: targetArchetype,
      transitionProbability,
      transitionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      supportingFactors: [
        "Consistent daily practices",
        "Identity-aligned behaviors",
        "Supportive environment",
      ],
      blockingFactors: [
        "Old patterns resurfacing",
        "Environmental resistance",
        "Identity tension",
      ],
    },
  ];
}

/**
 * Model relationship decision impact
 */
function modelRelationshipDecision(
  params: Record<string, any>,
  ctx: PulseCortexContext,
  horizonDays: number
): ScenarioResultV3["relationshipProjections"] {
  const decision = params.decision as "repair" | "end" | "deepen" | "maintain";
  const personId = params.personId as string;
  const personName = params.personName as string || "Relationship";

  const projections: ScenarioResultV3["relationshipProjections"] = [];

  if (decision === "repair") {
    projections.push({
      personId,
      personName,
      currentState: "conflict",
      projectedState: "repaired",
      transitionProbability: 0.7,
      transitionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      causalFactors: [
        "Active repair efforts",
        "Open communication",
        "Time investment",
      ],
    });
  } else if (decision === "deepen") {
    projections.push({
      personId,
      personName,
      currentState: "active",
      projectedState: "active",
      transitionProbability: 0.8,
      causalFactors: [
        "Increased engagement",
        "Meaningful interactions",
        "Shared experiences",
      ],
    });
  } else if (decision === "end") {
    projections.push({
      personId,
      personName,
      currentState: "active",
      projectedState: "neglected",
      transitionProbability: 0.9,
      transitionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      causalFactors: [
        "Lack of engagement",
        "No contact",
        "Relationship decay",
      ],
    });
  }

  return projections;
}

/**
 * Model career path impact
 */
function modelCareerPath(
  params: Record<string, any>,
  ctx: PulseCortexContext,
  horizonDays: number
): ScenarioResultV3["predictedArcs"] {
  const path = params.path as "execute" | "strategize" | "build" | "optimize";

  const arcs: ScenarioResultV3["predictedArcs"] = [];

  if (path === "execute") {
    arcs.push({
      domain: "work",
      type: "productivity",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
      trajectory: "improving",
      confidence: 0.7,
      description: "Focus on execution leads to productivity improvement",
      causalFactors: ["Task completion", "Momentum building", "Skill development"],
    });
  } else if (path === "strategize") {
    arcs.push({
      domain: "strategy",
      type: "strategic_thinking",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString(),
      trajectory: "improving",
      confidence: 0.8,
      description: "Strategic focus leads to better decision-making",
      causalFactors: ["Pattern recognition", "Long-term thinking", "Strategic planning"],
    });
  }

  return arcs;
}

/**
 * Model financial decision impact
 */
function modelFinancialDecision(
  params: Record<string, any>,
  ctx: PulseCortexContext,
  horizonDays: number
): ScenarioResultV3["financialProjections"] {
  const decision = params.decision as "save" | "invest" | "spend" | "optimize";
  const amount = params.amount as number || 0;

  const projections: ScenarioResultV3["financialProjections"] = [];

  if (decision === "save") {
    projections.push({
      currentState: "stable",
      projectedState: "growth",
      cashflowCurve: generateCashflowCurve(horizonDays, amount, "positive"),
      riskFactors: ["Opportunity cost", "Liquidity constraints"],
      opportunityFactors: ["Financial security", "Future investment capacity"],
    });
  } else if (decision === "invest") {
    projections.push({
      currentState: "stable",
      projectedState: "growth",
      cashflowCurve: generateCashflowCurve(horizonDays, amount * 1.1, "positive"),
      riskFactors: ["Market volatility", "Investment risk"],
      opportunityFactors: ["Wealth growth", "Passive income potential"],
    });
  } else if (decision === "spend") {
    projections.push({
      currentState: "stable",
      projectedState: "stress",
      cashflowCurve: generateCashflowCurve(horizonDays, -amount, "negative"),
      riskFactors: ["Reduced savings", "Cashflow pressure"],
      opportunityFactors: ["Immediate value", "Quality of life"],
    });
  }

  return projections;
}

/**
 * Generate cashflow curve
 */
function generateCashflowCurve(
  horizonDays: number,
  baseAmount: number,
  trend: "positive" | "negative" | "stable"
): Array<{ date: string; amount: number }> {
  const curve: Array<{ date: string; amount: number }> = [];
  const intervals = Math.min(horizonDays, 12); // Monthly points for long horizons

  for (let i = 0; i <= intervals; i++) {
    const days = Math.floor((horizonDays / intervals) * i);
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    let amount = baseAmount;
    if (trend === "positive") {
      amount = baseAmount * (1 + i * 0.05); // 5% growth per interval
    } else if (trend === "negative") {
      amount = baseAmount * (1 - i * 0.03); // 3% decline per interval
    }

    curve.push({
      date: date.toISOString(),
      amount: Math.round(amount),
    });
  }

  return curve;
}



