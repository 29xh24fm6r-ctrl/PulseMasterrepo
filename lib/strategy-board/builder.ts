// Pulse Strategy Board Builder
// lib/strategy-board/builder.ts

import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { runAutonomy } from "@/lib/cortex/autonomy/v3";
import { scanIdentity, buildIdentityArcPlan } from "@/lib/identity/v3";
import { buildRelationshipPlan } from "@/lib/domains/relationships/v2/relationship-plan-builder";
import { generateMicroPlan } from "@/lib/cortex/executive";
import { runLifeSimulation } from "@/lib/simulation/v3/engine";
import { logTrace } from "@/lib/cortex/trace/trace";
import { scanMission } from "@/lib/purpose/v1/scanner";
import { buildSocialGraph } from "@/lib/relationships/social-graph/graph-builder";
import { generateTimeSliceOptimization } from "@/lib/time-slicing/v1/tse";
import { generateWeeklyPlan } from "@/lib/planning/weekly/v2/planner";
import {
  StrategyBoardData,
  StrategicPriority,
  StrategyOpportunity,
  StrategyRisk,
  DailyLever,
  FinancialProjection,
  CareerProjection,
} from "./types";
import { PulseObjective } from "@/lib/cortex/executive";
import { v4 as uuidv4 } from "uuid";

/**
 * Build complete strategy board data
 */
export async function buildStrategyBoard(userId: string): Promise<StrategyBoardData> {
  const startTime = Date.now();

  await logTrace(
    userId,
    "cortex",
    "info",
    "Building Strategy Board",
    {},
    { domain: "strategy_board" }
  );

  // Build Cortex context
  const ctx = await getWorkCortexContextForUser(userId);

  // Get identity profile and arc
  const identityProfile = await scanIdentity(userId, ctx);
  const identityArc = buildIdentityArcPlan(identityProfile, ctx);

  // Get life chapters
  const lifeChapters = ctx.longitudinal.chapters.slice(-5); // Last 5 chapters

  // Build relationship plans for key people
  const keyRelationships = await buildKeyRelationshipPlans(ctx, userId);

  // Generate financial projection
  const financialHealth = generateFinancialProjection(ctx);

  // Generate career map
  const careerMap = generateCareerMap(ctx);

  // Generate quarterly plan
  const quarterlyPlan = await generateQuarterlyPlan(ctx, identityProfile);

  // Generate strategic priorities
  const strategicPriorities = generateStrategicPriorities(ctx, identityProfile);

  // Run simulation for opportunities and risks
  const simulation = await runLifeSimulation({
    userId,
    horizonDays: 90,
    scenarios: [
      {
        id: "baseline",
        title: "Baseline",
        parameterAdjustments: {},
      },
    ],
    includeCausalModeling: true,
  });

  const opportunities = extractOpportunities(simulation.scenarios[0]);
  const risks = extractRisks(simulation.scenarios[0]);

  // Generate daily levers
  const dailyLevers = generateDailyLevers(ctx, identityProfile);

  // Get mission profile
  const missionProfile = await scanMission(userId, ctx);

  // Get social graph
  const socialGraph = await buildSocialGraph(userId, ctx);

  // Get time slice optimization
  const timeSlices = generateTimeSliceOptimization(ctx);

  // Get weekly plan alignment
  const weeklyPlan = await generateWeeklyPlan(userId);

  const duration = Date.now() - startTime;

  await logTrace(
    userId,
    "cortex",
    "info",
    `Strategy Board built in ${duration}ms`,
    { durationMs: duration },
    { domain: "strategy_board" }
  );

  return {
    identityArc,
    lifeChapters,
    keyRelationships,
    financialHealth,
    careerMap,
    quarterlyPlan,
    strategicPriorities,
    opportunities,
    risks,
    dailyLevers,
    missionProfile,
    socialGraph,
    timeSlices,
    weeklyPlan,
  };
}

/**
 * Build relationship plans for key people
 */
async function buildKeyRelationshipPlans(
  ctx: PulseCortexContext,
  userId: string
): Promise<StrategyBoardData["keyRelationships"]> {
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const plans: StrategyBoardData["keyRelationships"] = [];

  for (const person of relationships.slice(0, 5)) {
    // Determine goal based on state
    let goal: "reconnect" | "repair" | "strengthen" | "maintain" = "maintain";
    if (person.daysSinceInteraction > 30) goal = "reconnect";
    if (person.relationshipScore < 50) goal = "repair";
    if (person.relationshipScore > 80 && person.daysSinceInteraction < 7) goal = "strengthen";

    // Build relationship state (simplified)
    const relationshipState = {
      personId: person.id,
      personName: person.name,
      lastContact: person.lastInteractionAt || null,
      frequencyPattern: "monthly" as const,
      emotionalAssociation: "positive" as const,
      importanceScore: person.relationshipScore,
      riskScore: person.daysSinceInteraction > 30 ? 60 : 20,
      opportunityScore: person.daysSinceInteraction > 30 && person.daysSinceInteraction < 60
        ? 70
        : 30,
      history: [],
      relationshipScore: person.relationshipScore,
      daysSinceInteraction: person.daysSinceInteraction,
    };

    const plan = buildRelationshipPlan(relationshipState, ctx, goal);
    plans.push(plan);
  }

  return plans;
}

/**
 * Generate financial projection
 */
function generateFinancialProjection(ctx: PulseCortexContext): FinancialProjection {
  const finance = ctx.domains.finance;

  if (!finance || !finance.cashflowProjection) {
    return {
      currentState: "stable",
      projectedState: "stable",
      cashflowCurve: [],
      riskFactors: [],
      opportunityFactors: [],
      summary: "No financial data available",
    };
  }

  const currentState: FinancialProjection["currentState"] =
    finance.cashflowProjection.trend === "negative"
      ? "stress"
      : finance.cashflowProjection.trend === "positive"
      ? "growth"
      : "stable";

  const projectedState: FinancialProjection["projectedState"] =
    finance.cashflowProjection.trend === "negative"
      ? "crisis"
      : finance.cashflowProjection.trend === "positive"
      ? "growth"
      : "stable";

  // Generate cashflow curve
  const cashflowCurve: FinancialProjection["cashflowCurve"] = [];
  for (let i = 0; i <= 12; i++) {
    const date = new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000);
    const amount = finance.cashflowProjection.next30Days * (1 + i * 0.05);
    cashflowCurve.push({
      date: date.toISOString(),
      amount: Math.round(amount),
    });
  }

  return {
    currentState,
    projectedState,
    cashflowCurve,
    riskFactors:
      finance.cashflowProjection.trend === "negative"
        ? ["Negative cashflow", "Obligations exceeding income"]
        : [],
    opportunityFactors:
      finance.cashflowProjection.trend === "positive"
        ? ["Positive cashflow", "Investment capacity"]
        : [],
    summary: `Financial state: ${currentState}, projected: ${projectedState}`,
  };
}

/**
 * Generate career map
 */
function generateCareerMap(ctx: PulseCortexContext): CareerProjection {
  const work = ctx.domains.work;
  const strategy = ctx.domains.strategy;

  // Determine current phase
  const activeProjects = work?.activeProjects || [];
  const arcs = strategy?.arcs || [];

  let currentPhase: CareerProjection["currentPhase"] = "building";
  if (activeProjects.length === 0) currentPhase = "exploration";
  if (arcs.length > 3) currentPhase = "optimization";
  if (arcs.some((a) => a.progress < 0.1)) currentPhase = "transition";

  // Determine trajectory
  const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  let trajectory: CareerProjection["trajectory"] = "stable";
  if (productivityArcs.length > 0 && productivityArcs[0].strength > 0.7) {
    trajectory = "accelerating";
  }

  // Generate milestones
  const keyMilestones: CareerProjection["keyMilestones"] = arcs
    .slice(0, 3)
    .map((arc) => ({
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: arc.name,
      importance: arc.priority || 50,
    }));

  return {
    currentPhase,
    trajectory,
    keyMilestones,
    skillsToDevelop: ["Strategic thinking", "Execution", "Leadership"],
    opportunities: ["High productivity window", "Strategic arc momentum"],
    risks: ["Burnout risk", "Task overload"],
  };
}

/**
 * Generate quarterly plan
 */
async function generateQuarterlyPlan(
  ctx: PulseCortexContext,
  identityProfile: any
): Promise<StrategyBoardData["quarterlyPlan"]> {
  const plans: StrategyBoardData["quarterlyPlan"] = [];

  // Get strategic priorities
  const strategy = ctx.domains.strategy;
  const bigThree = strategy?.currentQuarterFocus?.bigThree || [];

  // Create objectives from Big 3
  const objectives: PulseObjective[] = bigThree.map((item) => ({
    id: uuidv4(),
    domain: "strategy",
    title: item.title,
    description: `Quarterly focus: ${item.title}`,
    importance: 90,
    urgency: 70,
    estimatedMinutes: 60,
  }));

  if (objectives.length > 0) {
    const plan = generateMicroPlan(objectives, ctx);
    plans.push(plan);
  }

  // Add identity arc practices
  const identityObjectives: PulseObjective[] = [
    {
      id: uuidv4(),
      domain: "life",
      title: `Daily ${identityProfile.currentArchetype} practice`,
      description: "Identity-aligned daily practice",
      importance: 80,
      urgency: 50,
      estimatedMinutes: 15,
    },
  ];

  const identityPlan = generateMicroPlan(identityObjectives, ctx);
  plans.push(identityPlan);

  return plans;
}

/**
 * Generate strategic priorities
 */
function generateStrategicPriorities(
  ctx: PulseCortexContext,
  identityProfile: any
): StrategicPriority[] {
  const priorities: StrategicPriority[] = [];

  // Identity transformation
  if (identityProfile.transformationArc) {
    priorities.push({
      id: "identity_transformation",
      title: `Transform to ${identityProfile.transformationArc.to}`,
      description: identityProfile.transformationArc.description || "Identity transformation",
      domain: "life",
      importance: 85,
      urgency: 60,
      progress: identityProfile.transformationArc.progress || 0,
      nextSteps: [
        "Daily identity practices",
        "Align behaviors with target archetype",
        "Track transformation progress",
      ],
    });
  }

  // Strategic arcs
  const arcs = ctx.domains.strategy?.arcs || [];
  for (const arc of arcs.slice(0, 3)) {
    priorities.push({
      id: `arc_${arc.id}`,
      title: arc.name,
      description: `Strategic arc: ${arc.name}`,
      domain: "strategy",
      importance: (arc.priority || 50) * 2,
      urgency: 70,
      progress: arc.progress || 0,
      nextSteps: [
        "Review arc progress",
        "Plan next milestone",
        "Execute arc actions",
      ],
    });
  }

  // Relationship priorities
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const neglected = relationships.filter((p) => p.daysSinceInteraction > 30);
  if (neglected.length > 0) {
    priorities.push({
      id: "relationship_reconnection",
      title: "Reconnect with key relationships",
      description: `${neglected.length} important relationships need attention`,
      domain: "relationships",
      importance: 75,
      urgency: 80,
      progress: 0,
      nextSteps: [
        "Identify top 3 relationships",
        "Create reconnection plans",
        "Initiate contact",
      ],
    });
  }

  // Financial priorities
  const finance = ctx.domains.finance;
  if (finance?.cashflowProjection?.trend === "negative") {
    priorities.push({
      id: "financial_stability",
      title: "Achieve financial stability",
      description: "Address negative cashflow trend",
      domain: "finance",
      importance: 90,
      urgency: 90,
      progress: 0,
      nextSteps: [
        "Review cashflow",
        "Reduce expenses",
        "Increase income sources",
      ],
    });
  }

  return priorities.sort((a, b) => {
    const aScore = a.importance + a.urgency;
    const bScore = b.importance + b.urgency;
    return bScore - aScore;
  });
}

/**
 * Extract opportunities from simulation
 */
function extractOpportunities(scenario: any): StrategyOpportunity[] {
  const opportunities: StrategyOpportunity[] = [];

  for (const opp of scenario.opportunityWindows || []) {
    opportunities.push({
      id: opp.id,
      title: opp.description,
      description: opp.description,
      domain: opp.domain,
      priority: opp.priority,
      timeWindow: {
        start: opp.startDate,
        end: opp.endDate,
      },
      suggestedActions: opp.suggestedActions || [],
      potentialImpact: `High impact in ${opp.domain}`,
    });
  }

  return opportunities;
}

/**
 * Extract risks from simulation
 */
function extractRisks(scenario: any): StrategyRisk[] {
  const risks: StrategyRisk[] = [];

  for (const risk of scenario.riskWindows || []) {
    risks.push({
      id: risk.id,
      title: risk.description,
      description: risk.description,
      domain: risk.domain,
      severity: risk.severity,
      timeWindow: {
        start: risk.startDate,
        end: risk.endDate,
      },
      mitigation: risk.mitigation || [],
      potentialImpact: `High impact in ${risk.domain}`,
    });
  }

  return risks;
}

/**
 * Generate daily levers
 */
function generateDailyLevers(
  ctx: PulseCortexContext,
  identityProfile: any
): DailyLever[] {
  const levers: DailyLever[] = [];

  // Energy lever
  if (ctx.cognitiveProfile.currentEnergyLevel < 0.5) {
    levers.push({
      id: "energy_management",
      title: "Energy Management",
      description: "Optimize energy levels through rest and recovery",
      domain: "life",
      impact: "high",
      controllability: "high",
      action: "Schedule rest periods, reduce cognitive load",
    });
  }

  // Task focus lever
  const workQueue = ctx.domains.work?.queue || [];
  if (workQueue.length > 10) {
    levers.push({
      id: "task_focus",
      title: "Task Prioritization",
      description: "Focus on top 3 high-impact tasks",
      domain: "work",
      impact: "high",
      controllability: "high",
      action: "Identify and execute top priorities",
    });
  }

  // Relationship lever
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const opportunities = relationships.filter(
    (p) => p.daysSinceInteraction > 30 && p.daysSinceInteraction < 60
  );
  if (opportunities.length > 0) {
    levers.push({
      id: "relationship_reconnection",
      title: "Relationship Reconnection",
      description: `Reconnect with ${opportunities[0].name}`,
      domain: "relationships",
      impact: "medium",
      controllability: "high",
      action: "Initiate contact with key relationship",
    });
  }

  return levers.slice(0, 3); // Top 3
}

