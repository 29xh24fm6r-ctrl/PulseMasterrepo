// Decision Analysis Engine
// lib/cortex/sovereign/decision-partner/analyzer.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { DecisionScenario, DecisionAnalysisResult, DecisionOptionAnalysis } from "./types";
import { scanIdentity } from "@/lib/identity/v3";
import { scanMission } from "@/lib/purpose/v1/scanner";
import { runLifeSimulation } from "@/lib/simulation/v3/engine";
import { buildSocialGraph } from "@/lib/relationships/social-graph/graph-builder";
import { logTrace } from "@/lib/cortex/trace/trace";
import { callAIJson } from "@/lib/ai/call";

/**
 * Analyze decision scenario
 */
export async function analyzeDecision(
  userId: string,
  scenario: DecisionScenario,
  ctx: PulseCortexContext
): Promise<DecisionAnalysisResult> {
  await logTrace(
    userId,
    "cortex",
    "info",
    `Analyzing decision: ${scenario.title}`,
    { scenarioId: scenario.id, optionCount: scenario.options.length },
    { domain: "decision_partner" }
  );

  // Get identity and mission profiles
  const identityProfile = await scanIdentity(userId, ctx);
  const missionProfile = await scanMission(userId, ctx);
  const socialGraph = await buildSocialGraph(userId, ctx);

  // Analyze each option
  const optionAnalyses: DecisionOptionAnalysis[] = [];

  for (const option of scenario.options) {
    const analysis = await analyzeOption(
      userId,
      option,
      scenario,
      ctx,
      identityProfile,
      missionProfile,
      socialGraph
    );
    optionAnalyses.push(analysis);
  }

  // Generate summary and recommendation
  const summary = generateSummary(optionAnalyses, scenario);
  const recommendation = generateRecommendation(optionAnalyses, identityProfile, missionProfile);
  const unknowns = identifyUnknowns(scenario, ctx);
  const suggestedNextSteps = generateNextSteps(optionAnalyses, recommendation);

  // Log analysis
  await logTrace(
    userId,
    "cortex",
    "info",
    `Decision analysis complete: ${scenario.title}`,
    {
      scenarioId: scenario.id,
      recommendation: recommendation?.optionId,
      confidence: recommendation?.confidence,
    },
    { domain: "decision_partner" }
  );

  return {
    scenarioId: scenario.id,
    analyzedAt: new Date().toISOString(),
    options: optionAnalyses,
    summary,
    recommendation,
    unknowns,
    suggestedNextSteps,
  };
}

/**
 * Analyze individual option
 */
async function analyzeOption(
  userId: string,
  option: DecisionScenario["options"][0],
  scenario: DecisionScenario,
  ctx: PulseCortexContext,
  identityProfile: any,
  missionProfile: any,
  socialGraph: any
): Promise<DecisionOptionAnalysis> {
  // Use AI to analyze the option
  const systemPrompt = `You are analyzing a decision option for a user. Consider:
- Identity archetype: ${identityProfile.currentArchetype}
- Mission: ${missionProfile.mission}
- Current context: ${JSON.stringify(ctx, null, 2)}

Analyze this option: "${option.label}" - ${option.description || ""}

Provide a comprehensive analysis including:
- Projected benefits (3-5 items)
- Projected costs (3-5 items)
- Identity alignment (score 0-1 and reasoning)
- Risk profile (level and factors)
- Relationship impact
- Financial impact
- Emotional impact
- Time impact
- Overall score (0-1)

Respond in JSON format.`;

  const userPrompt = `Decision: ${scenario.title}\nOption: ${option.label}\n${option.description || ""}`;

  const response = await callAIJson<{
    projectedBenefits: string[];
    projectedCosts: string[];
    identityAlignment: { score: number; reasoning: string };
    riskProfile: { level: "low" | "medium" | "high"; factors: string[] };
    relationshipImpact: { description: string; affectedRelationships: string[] };
    financialImpact: { description: string; estimatedCost?: number; estimatedBenefit?: number };
    emotionalImpact: { description: string; projectedEmotion: string };
    timeImpact: { description: string; estimatedHours?: number };
    overallScore: number;
  }>({
    userId,
    feature: "decision_analysis",
    systemPrompt,
    userPrompt,
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    // Fallback to simple heuristic analysis
    return generateHeuristicAnalysis(option, identityProfile, missionProfile);
  }

  return {
    optionId: option.id,
    label: option.label,
    ...response.data,
  };
}

/**
 * Generate heuristic analysis (fallback)
 */
function generateHeuristicAnalysis(
  option: DecisionScenario["options"][0],
  identityProfile: any,
  missionProfile: any
): DecisionOptionAnalysis {
  // Simple heuristic-based analysis
  const identityScore = option.label.toLowerCase().includes(identityProfile.currentArchetype)
    ? 0.8
    : 0.5;

  return {
    optionId: option.id,
    label: option.label,
    projectedBenefits: ["Potential growth", "New opportunities", "Alignment with goals"],
    projectedCosts: ["Time investment", "Resource commitment", "Risk exposure"],
    identityAlignment: {
      score: identityScore,
      reasoning: `Option aligns with ${identityProfile.currentArchetype} archetype`,
    },
    riskProfile: {
      level: "medium",
      factors: ["Uncertainty", "Resource requirements"],
    },
    relationshipImpact: {
      description: "Moderate impact on relationships",
      affectedRelationships: [],
    },
    financialImpact: {
      description: "Moderate financial impact",
    },
    emotionalImpact: {
      description: "Mixed emotional impact",
      projectedEmotion: "neutral",
    },
    timeImpact: {
      description: "Significant time investment required",
    },
    overallScore: identityScore,
  };
}

/**
 * Generate summary
 */
function generateSummary(
  analyses: DecisionOptionAnalysis[],
  scenario: DecisionScenario
): string {
  const topOption = analyses.sort((a, b) => b.overallScore - a.overallScore)[0];
  return `Analysis of "${scenario.title}" with ${scenario.options.length} options. Top option: ${topOption.label} (score: ${Math.round(topOption.overallScore * 100)}%). Consider identity alignment, risk profiles, and long-term impact.`;
}

/**
 * Generate recommendation
 */
function generateRecommendation(
  analyses: DecisionOptionAnalysis[],
  identityProfile: any,
  missionProfile: any
): DecisionAnalysisResult["recommendation"] | undefined {
  if (analyses.length === 0) return undefined;

  // Sort by overall score
  const sorted = analyses.sort((a, b) => b.overallScore - a.overallScore);
  const topOption = sorted[0];

  // Check if there's a clear winner
  if (sorted.length > 1 && topOption.overallScore - sorted[1].overallScore > 0.2) {
    return {
      optionId: topOption.optionId,
      confidence: topOption.overallScore,
      reasoning: `Option "${topOption.label}" has highest overall score and aligns with ${identityProfile.currentArchetype} archetype.`,
    };
  }

  // If scores are close, recommend based on identity alignment
  const identitySorted = analyses.sort(
    (a, b) => b.identityAlignment.score - a.identityAlignment.score
  );
  const identityTop = identitySorted[0];

  if (identityTop.identityAlignment.score > 0.7) {
    return {
      optionId: identityTop.optionId,
      confidence: identityTop.identityAlignment.score,
      reasoning: `Option "${identityTop.label}" best aligns with your ${identityProfile.currentArchetype} identity and mission.`,
    };
  }

  return undefined; // No clear recommendation
}

/**
 * Identify unknowns
 */
function identifyUnknowns(scenario: DecisionScenario, ctx: PulseCortexContext): string[] {
  const unknowns: string[] = [];

  // Check for missing context
  if (!ctx.domains.finance) {
    unknowns.push("Financial impact may be uncertain without complete financial data");
  }

  if (!ctx.domains.relationships?.keyPeople || ctx.domains.relationships.keyPeople.length === 0) {
    unknowns.push("Relationship impact may be uncertain without complete relationship data");
  }

  // General unknowns
  unknowns.push("Long-term consequences may differ from projections");
  unknowns.push("External factors may influence outcomes");

  return unknowns;
}

/**
 * Generate next steps
 */
function generateNextSteps(
  analyses: DecisionOptionAnalysis[],
  recommendation?: DecisionAnalysisResult["recommendation"]
): string[] {
  const steps: string[] = [];

  if (recommendation) {
    steps.push(`Research option "${recommendation.optionId}" in more detail`);
  }

  steps.push("Gather additional information on unknowns");
  steps.push("Consult with key relationships if applicable");
  steps.push("Consider running a simulation for each option");
  steps.push("Set a decision deadline");

  return steps;
}



