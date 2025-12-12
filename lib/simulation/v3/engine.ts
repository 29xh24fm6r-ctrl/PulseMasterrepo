// Pulse Simulation Engine v3 - Enhanced with Causal & Choice Modeling
// lib/simulation/v3/engine.ts

import { buildPulseCortexContext } from "@/lib/cortex/context";
import { runAutonomy } from "@/lib/cortex/autonomy/v3";
import { logTrace } from "@/lib/cortex/trace/trace";
import {
  SimulationInputV3,
  SimulationOutputV3,
  ScenarioResultV3,
} from "./types";
import {
  productivityTrajectory,
  emotionalTrajectory,
  relationshipTrajectory,
  financialTrajectory,
  habitTrajectory,
} from "../v2/trajectories";
import { detectCausalRelationships, applyCausalModeling } from "./causal-modeling";
import { modelChoiceImpact } from "./choice-modeling";
import { scanIdentity } from "@/lib/identity/v3/identity-scanner";

/**
 * Run enhanced simulation with causal and choice modeling
 */
export async function runLifeSimulation(
  input: SimulationInputV3
): Promise<SimulationOutputV3> {
  const startTime = Date.now();

  await logTrace(
    input.userId,
    "cortex",
    "info",
    `Starting simulation v3: ${input.horizonDays} days, ${input.scenarios.length} scenarios`,
    {
      horizonDays: input.horizonDays,
      scenarioCount: input.scenarios.length,
      includeCausal: input.includeCausalModeling,
      includeChoice: input.includeChoiceModeling,
    },
    { domain: "simulation" }
  );

  // Build Cortex context
  const baseContext = await buildPulseCortexContext(input.userId);

  // Detect causal relationships if enabled
  let causalInsights;
  if (input.includeCausalModeling !== false) {
    causalInsights = detectCausalRelationships(baseContext);
    await logTrace(
      input.userId,
      "cortex",
      "info",
      `Detected ${causalInsights.length} causal relationships`,
      { insightCount: causalInsights.length },
      { domain: "simulation" }
    );
  }

  // Get identity profile
  const identityProfile = await scanIdentity(input.userId, baseContext);

  const scenarioResults: ScenarioResultV3[] = [];

  // Run each scenario
  for (const scenario of input.scenarios) {
    await logTrace(
      input.userId,
      "cortex",
      "info",
      `Running scenario: ${scenario.title}`,
      { scenarioId: scenario.id },
      { domain: "simulation" }
    );

    // Apply scenario adjustments
    const adjustedContext = applyScenarioAdjustments(baseContext, scenario);

    // Run trajectory analysis
    const predictedArcs = await runTrajectoryAnalysisV3(
      adjustedContext,
      input.horizonDays,
      causalInsights
    );

    // Model choice impact if provided
    const choiceImpact = scenario.choiceModeling
      ? modelChoiceImpact(scenario.choiceModeling, adjustedContext, input.horizonDays)
      : {};

    // Detect risk and opportunity windows
    const riskWindows = detectRiskWindowsV3(
      adjustedContext,
      predictedArcs,
      input.horizonDays,
      causalInsights
    );
    const opportunityWindows = detectOpportunityWindowsV3(
      adjustedContext,
      predictedArcs,
      input.horizonDays,
      causalInsights
    );

    // Get autonomy actions
    const autonomyActions = runAutonomy(adjustedContext);
    const recommendedActions = autonomyActions
      .filter((a) => a.severity === "urgent" || a.severity === "warning")
      .slice(0, 5);

    // Generate identity projections
    const identityProjections = choiceImpact.identityProjections || [
      {
        currentArchetype: identityProfile.currentArchetype,
        projectedArchetype: scenario.parameterAdjustments.identityArchetype ||
          identityProfile.currentArchetype,
        transitionProbability: 0.7,
        supportingFactors: identityProfile.strengths,
        blockingFactors: identityProfile.blindspots,
      },
    ];

    // Generate relationship projections
    const relationshipProjections = choiceImpact.relationshipProjections ||
      generateRelationshipProjections(adjustedContext, input.horizonDays);

    // Generate financial projections
    const financialProjections = choiceImpact.financialProjections ||
      generateFinancialProjections(adjustedContext, input.horizonDays);

    // EF bottleneck analysis
    const efBottleneckAnalysis = analyzeEFBottlenecks(adjustedContext, input.horizonDays);

    // Generate summary
    const summary = generateScenarioSummaryV3(
      predictedArcs,
      riskWindows,
      opportunityWindows,
      recommendedActions,
      identityProjections
    );

    scenarioResults.push({
      id: scenario.id,
      title: scenario.title,
      predictedArcs: [...predictedArcs, ...(choiceImpact.predictedArcs || [])],
      riskWindows,
      opportunityWindows,
      recommendedActions,
      identityProjections,
      relationshipProjections,
      financialProjections,
      efBottleneckAnalysis,
      summary,
    });
  }

  const duration = Date.now() - startTime;

  await logTrace(
    input.userId,
    "cortex",
    "info",
    `Simulation v3 complete: ${scenarioResults.length} scenarios analyzed`,
    { durationMs: duration, scenarioCount: scenarioResults.length },
    { domain: "simulation" }
  );

  return {
    userId: input.userId,
    horizonDays: input.horizonDays,
    scenarios: scenarioResults,
    generatedAt: new Date().toISOString(),
    causalInsights,
  };
}

/**
 * Apply scenario parameter adjustments
 */
function applyScenarioAdjustments(
  baseContext: PulseCortexContext,
  scenario: SimulationInputV3["scenarios"][0]
): PulseCortexContext {
  const adjusted = JSON.parse(JSON.stringify(baseContext)) as PulseCortexContext;

  const params = scenario.parameterAdjustments;

  if (params.energyLevel !== undefined) {
    adjusted.cognitiveProfile.currentEnergyLevel = params.energyLevel;
  }

  if (params.emotionalVolatility !== undefined) {
    if (adjusted.emotion) {
      adjusted.emotion.intensity = params.emotionalVolatility;
    }
  }

  if (params.taskThroughput !== undefined && adjusted.domains.work?.queue) {
    const multiplier = params.taskThroughput;
    adjusted.domains.work.queue = adjusted.domains.work.queue.slice(
      0,
      Math.floor(adjusted.domains.work.queue.length * multiplier)
    );
  }

  return adjusted;
}

/**
 * Run trajectory analysis with causal modeling
 */
async function runTrajectoryAnalysisV3(
  ctx: PulseCortexContext,
  horizonDays: number,
  causalInsights?: any[]
): Promise<ScenarioResultV3["predictedArcs"]> {
  const arcs: ScenarioResultV3["predictedArcs"] = [];

  // Get base trajectories
  const productivityArc = productivityTrajectory(ctx, horizonDays);
  const emotionalArc = emotionalTrajectory(ctx, horizonDays);
  const relationshipArc = relationshipTrajectory(ctx, horizonDays);
  const financialArc = financialTrajectory(ctx, horizonDays);
  const habitArc = habitTrajectory(ctx, horizonDays);

  // Apply causal modeling if available
  if (causalInsights && causalInsights.length > 0) {
    if (productivityArc) {
      const adjusted = applyCausalModeling(
        productivityArc.trajectory,
        causalInsights,
        horizonDays
      );
      arcs.push({
        ...productivityArc,
        trajectory: adjusted.adjustedTrajectory,
        causalFactors: adjusted.causalFactors,
      });
    }
  } else {
    if (productivityArc) arcs.push(productivityArc);
  }

  if (emotionalArc) arcs.push(emotionalArc);
  if (relationshipArc) arcs.push(relationshipArc);
  if (financialArc) arcs.push(financialArc);
  if (habitArc) arcs.push(habitArc);

  return arcs;
}

/**
 * Detect risk windows with causal chains
 */
function detectRiskWindowsV3(
  ctx: PulseCortexContext,
  arcs: ScenarioResultV3["predictedArcs"],
  horizonDays: number,
  causalInsights?: any[]
): ScenarioResultV3["riskWindows"] {
  const risks: ScenarioResultV3["riskWindows"] = [];

  // Check declining arcs
  for (const arc of arcs) {
    if (arc.trajectory === "declining") {
      risks.push({
        id: `risk_${arc.domain}_${arc.type}`,
        domain: arc.domain,
        startDate: arc.startDate,
        endDate: arc.endDate,
        severity: arc.confidence > 0.7 ? "high" : arc.confidence > 0.5 ? "medium" : "low",
        description: `Predicted ${arc.type} decline in ${arc.domain}`,
        causalChain: arc.causalFactors || [],
        mitigation: generateMitigationStrategies(arc),
        metadata: { arcType: arc.type, confidence: arc.confidence },
      });
    }
  }

  // Add causal chain insights
  if (causalInsights) {
    for (const insight of causalInsights) {
      if (insight.effect.includes("decline") || insight.effect.includes("neglect")) {
        const futureDate = new Date(Date.now() + insight.delay * 24 * 60 * 60 * 1000);
        if (futureDate.getTime() < Date.now() + horizonDays * 24 * 60 * 60 * 1000) {
          risks.push({
            id: `risk_causal_${insight.cause}`,
            domain: "global",
            startDate: futureDate.toISOString(),
            endDate: new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            severity: insight.strength > 0.7 ? "high" : "medium",
            description: insight.description,
            causalChain: [insight.cause, insight.effect],
            mitigation: [`Address ${insight.cause}`, "Monitor for early signs"],
            metadata: { insight },
          });
        }
      }
    }
  }

  return risks;
}

/**
 * Detect opportunity windows with causal chains
 */
function detectOpportunityWindowsV3(
  ctx: PulseCortexContext,
  arcs: ScenarioResultV3["predictedArcs"],
  horizonDays: number,
  causalInsights?: any[]
): ScenarioResultV3["opportunityWindows"] {
  const opportunities: ScenarioResultV3["opportunityWindows"] = [];

  // Check improving arcs
  for (const arc of arcs) {
    if (arc.trajectory === "improving" && arc.confidence > 0.6) {
      opportunities.push({
        id: `opp_${arc.domain}_${arc.type}`,
        domain: arc.domain,
        startDate: arc.startDate,
        endDate: arc.endDate,
        priority: arc.confidence > 0.8 ? "high" : "medium",
        description: `Predicted ${arc.type} improvement in ${arc.domain}`,
        causalChain: arc.causalFactors || [],
        suggestedActions: generateOpportunityActions(arc),
        metadata: { arcType: arc.type, confidence: arc.confidence },
      });
    }
  }

  // Add causal opportunity insights
  if (causalInsights) {
    for (const insight of causalInsights) {
      if (insight.effect.includes("increase") || insight.effect.includes("growth")) {
        const futureDate = new Date(Date.now() + insight.delay * 24 * 60 * 60 * 1000);
        if (futureDate.getTime() < Date.now() + horizonDays * 24 * 60 * 60 * 1000) {
          opportunities.push({
            id: `opp_causal_${insight.cause}`,
            domain: "global",
            startDate: futureDate.toISOString(),
            endDate: new Date(futureDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            priority: insight.strength > 0.7 ? "high" : "medium",
            description: insight.description,
            causalChain: [insight.cause, insight.effect],
            suggestedActions: [`Leverage ${insight.cause}`, "Capitalize on momentum"],
            metadata: { insight },
          });
        }
      }
    }
  }

  return opportunities;
}

/**
 * Generate relationship projections
 */
function generateRelationshipProjections(
  ctx: PulseCortexContext,
  horizonDays: number
): ScenarioResultV3["relationshipProjections"] {
  const projections: ScenarioResultV3["relationshipProjections"] = [];

  const relationships = ctx.domains.relationships?.keyPeople || [];
  for (const person of relationships.slice(0, 5)) {
    let projectedState: ScenarioResultV3["relationshipProjections"][0]["projectedState"] = "active";
    let transitionProbability = 0.5;

    if (person.daysSinceInteraction > 30) {
      projectedState = "neglected";
      transitionProbability = 0.8;
    } else if (person.daysSinceInteraction < 7) {
      projectedState = "active";
      transitionProbability = 0.7;
    }

    projections.push({
      personId: person.id,
      personName: person.name,
      currentState: person.daysSinceInteraction > 14 ? "cooling" : "active",
      projectedState,
      transitionProbability,
      causalFactors: [
        `Days since contact: ${person.daysSinceInteraction}`,
        `Relationship score: ${person.relationshipScore}`,
      ],
    });
  }

  return projections;
}

/**
 * Generate financial projections
 */
function generateFinancialProjections(
  ctx: PulseCortexContext,
  horizonDays: number
): ScenarioResultV3["financialProjections"] {
  const finance = ctx.domains.finance;

  if (!finance) {
    return [
      {
        currentState: "stable",
        projectedState: "stable",
        cashflowCurve: [],
        riskFactors: [],
        opportunityFactors: [],
      },
    ];
  }

  const currentState: ScenarioResultV3["financialProjections"][0]["currentState"] =
    finance.cashflowProjection?.trend === "negative"
      ? "stress"
      : finance.cashflowProjection?.trend === "positive"
      ? "growth"
      : "stable";

  const projectedState: ScenarioResultV3["financialProjections"][0]["projectedState"] =
    finance.cashflowProjection?.trend === "negative"
      ? "crisis"
      : finance.cashflowProjection?.trend === "positive"
      ? "growth"
      : "stable";

  return [
    {
      currentState,
      projectedState,
      cashflowCurve: generateCashflowCurve(
        horizonDays,
        finance.cashflowProjection?.next30Days || 0,
        finance.cashflowProjection?.trend || "stable"
      ),
      riskFactors: finance.cashflowProjection?.trend === "negative"
        ? ["Negative cashflow", "Obligations exceeding income"]
        : [],
      opportunityFactors: finance.cashflowProjection?.trend === "positive"
        ? ["Positive cashflow", "Investment capacity"]
        : [],
    },
  ];
}

/**
 * Analyze EF bottlenecks
 */
function analyzeEFBottlenecks(
  ctx: PulseCortexContext,
  horizonDays: number
): ScenarioResultV3["efBottleneckAnalysis"] {
  const bottlenecks: ScenarioResultV3["efBottleneckAnalysis"]["bottlenecks"] = [];

  // Energy bottleneck
  if (ctx.cognitiveProfile.currentEnergyLevel < 0.4) {
    bottlenecks.push({
      type: "energy",
      severity: "high",
      description: "Low energy levels limiting task execution",
      impact: ["Reduced productivity", "Task avoidance", "Burnout risk"],
      recommendations: [
        "Prioritize rest",
        "Focus on high-impact tasks",
        "Reduce cognitive load",
      ],
    });
  }

  // Time bottleneck
  const workQueue = ctx.domains.work?.queue || [];
  if (workQueue.length > 15) {
    bottlenecks.push({
      type: "time",
      severity: "medium",
      description: "High task volume creating time pressure",
      impact: ["Task delays", "Quality compromise", "Stress increase"],
      recommendations: [
        "Prioritize ruthlessly",
        "Delegate where possible",
        "Break tasks into smaller steps",
      ],
    });
  }

  // Cognitive load bottleneck
  const activeProjects = ctx.domains.work?.activeProjects || [];
  if (activeProjects.length > 5) {
    bottlenecks.push({
      type: "cognitive_load",
      severity: "medium",
      description: "Too many active projects creating context switching",
      impact: ["Reduced focus", "Slower progress", "Mental fatigue"],
      recommendations: [
        "Focus on 2-3 projects",
        "Batch similar work",
        "Reduce context switching",
      ],
    });
  }

  // Emotional capacity bottleneck
  if (ctx.emotion && ctx.emotion.intensity > 0.8) {
    bottlenecks.push({
      type: "emotional_capacity",
      severity: "high",
      description: "High emotional intensity limiting capacity",
      impact: ["Reduced decision quality", "Relationship strain", "Burnout risk"],
      recommendations: [
        "Process emotions",
        "Reduce stressors",
        "Seek support",
      ],
    });
  }

  return { bottlenecks };
}

/**
 * Generate mitigation strategies
 */
function generateMitigationStrategies(arc: ScenarioResultV3["predictedArcs"][0]): string[] {
  const strategies: string[] = [];

  if (arc.domain === "work" && arc.type === "productivity") {
    strategies.push("Reduce workload", "Focus on high-impact tasks", "Increase rest periods");
  } else if (arc.domain === "relationships") {
    strategies.push("Increase engagement", "Initiate reconnection", "Address conflicts");
  } else if (arc.domain === "finance") {
    strategies.push("Review cashflow", "Reduce expenses", "Increase income sources");
  } else if (arc.domain === "life" && arc.type === "habit") {
    strategies.push("Simplify habits", "Reduce commitment", "Focus on consistency");
  }

  return strategies;
}

/**
 * Generate opportunity actions
 */
function generateOpportunityActions(arc: ScenarioResultV3["predictedArcs"][0]): string[] {
  const actions: string[] = [];

  if (arc.domain === "work" && arc.type === "productivity") {
    actions.push("Tackle important projects", "Increase focus time", "Build momentum");
  } else if (arc.domain === "relationships") {
    actions.push("Deepen connections", "Strengthen relationships", "Build strategic value");
  } else if (arc.domain === "finance") {
    actions.push("Optimize investments", "Increase savings", "Build income streams");
  } else if (arc.domain === "life" && arc.type === "habit") {
    actions.push("Add new habits", "Increase habit frequency", "Build on success");
  }

  return actions;
}

/**
 * Generate cashflow curve helper
 */
function generateCashflowCurve(
  horizonDays: number,
  baseAmount: number,
  trend: "positive" | "negative" | "neutral"
): Array<{ date: string; amount: number }> {
  const curve: Array<{ date: string; amount: number }> = [];
  const intervals = Math.min(horizonDays, 12);

  for (let i = 0; i <= intervals; i++) {
    const days = Math.floor((horizonDays / intervals) * i);
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    let amount = baseAmount;
    if (trend === "positive") {
      amount = baseAmount * (1 + i * 0.05);
    } else if (trend === "negative") {
      amount = baseAmount * (1 - i * 0.03);
    }

    curve.push({
      date: date.toISOString(),
      amount: Math.round(amount),
    });
  }

  return curve;
}

/**
 * Generate scenario summary
 */
function generateScenarioSummaryV3(
  arcs: ScenarioResultV3["predictedArcs"],
  risks: ScenarioResultV3["riskWindows"],
  opportunities: ScenarioResultV3["opportunityWindows"],
  actions: any[],
  identityProjections: ScenarioResultV3["identityProjections"]
): string {
  const parts: string[] = [];

  if (arcs.length > 0) {
    const improving = arcs.filter((a) => a.trajectory === "improving").length;
    const declining = arcs.filter((a) => a.trajectory === "declining").length;
    parts.push(`${improving} improving arcs, ${declining} declining arcs predicted.`);
  }

  if (risks.length > 0) {
    const highRisks = risks.filter((r) => r.severity === "high").length;
    parts.push(`${highRisks} high-severity risk windows detected.`);
  }

  if (opportunities.length > 0) {
    const highOpps = opportunities.filter((o) => o.priority === "high").length;
    parts.push(`${highOpps} high-priority opportunity windows identified.`);
  }

  if (identityProjections.length > 0) {
    const transitions = identityProjections.filter((p) => p.transitionProbability > 0.6);
    if (transitions.length > 0) {
      parts.push(`${transitions.length} identity transitions likely.`);
    }
  }

  if (actions.length > 0) {
    parts.push(`${actions.length} recommended actions generated.`);
  }

  return parts.join(" ") || "No significant changes predicted.";
}



