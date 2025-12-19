// Autonomous Weekly Planning Engine v2
// lib/planning/weekly/v2/planner.ts

import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { scanIdentity, buildIdentityArcPlan } from "@/lib/identity/v3";
import { runLifeSimulation } from "@/lib/simulation/v3/engine";
import { generateTimeSlices } from "@/lib/time-slicing/v1/tse";
import { generateMicroPlan } from "@/lib/cortex/executive";
import { runAutonomy } from "@/lib/cortex/autonomy/v3";
import { logTrace } from "@/lib/cortex/trace/trace";
import { WeeklyPlan, DomainObjective, RelationshipAction, FinancialAction, DailyPlan } from "./types";
import { PulseObjective } from "@/lib/cortex/executive";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate complete weekly plan
 */
export async function generateWeeklyPlan(userId: string): Promise<WeeklyPlan> {
  const startTime = Date.now();

  await logTrace(
    userId,
    "cortex",
    "info",
    "Generating weekly plan",
    {},
    { domain: "weekly_planning" }
  );

  // 1. Build Cortex Context
  const ctx = await getWorkCortexContextForUser(userId);

  // 2. Pull Identity Arc
  const identityProfile = await scanIdentity(userId, ctx);
  const identityArc = buildIdentityArcPlan(identityProfile, ctx);

  // 3. Pull Relationship Intelligence
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const relationshipTouches = generateRelationshipTouches(relationships, ctx);

  // 4. Pull Financial + Work domain contexts
  const financialCheckpoints = generateFinancialCheckpoints(ctx);
  const domainObjectives = await generateDomainObjectives(ctx, identityProfile);

  // 5. Pull Simulation v3 predictions
  const simulation = await runLifeSimulation({
    userId,
    horizonDays: 7,
    scenarios: [
      {
        id: "baseline",
        title: "Baseline Week",
        parameterAdjustments: {},
      },
    ],
    includeCausalModeling: true,
  });

  // 6. Generate Big Three priorities
  const bigThree = generateBigThree(ctx, identityProfile, simulation.scenarios[0]);

  // 7. Generate risk mitigations and opportunity moves
  const riskMitigations = generateRiskMitigations(simulation.scenarios[0]);
  const opportunityMoves = generateOpportunityMoves(simulation.scenarios[0]);

  // 8. Generate time slices
  const timeBlocks = generateTimeSlices(ctx);

  // 9. Build daily plans
  const dailyPlans = generateDailyPlans(
    ctx,
    identityArc,
    domainObjectives,
    relationshipTouches,
    timeBlocks
  );

  // 10. Calculate mission alignment
  const missionAlignment = calculateMissionAlignment(ctx, identityProfile, bigThree);

  // Calculate week boundaries
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const plan: WeeklyPlan = {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    bigThree,
    identityObjectives: identityArc.dailyPractices.slice(0, 7), // One per day
    domainObjectives,
    relationshipTouches,
    financialCheckpoints,
    riskMitigations,
    opportunityMoves,
    timeBlocks,
    dailyPlans,
    missionAlignment,
    generatedAt: new Date().toISOString(),
  };

  const duration = Date.now() - startTime;

  await logTrace(
    userId,
    "cortex",
    "info",
    `Weekly plan generated in ${duration}ms`,
    {
      durationMs: duration,
      bigThreeCount: bigThree.length,
      domainObjectivesCount: domainObjectives.length,
      relationshipTouchesCount: relationshipTouches.length,
      dailyPlansCount: dailyPlans.length,
    },
    { domain: "weekly_planning" }
  );

  return plan;
}

/**
 * Generate Big Three priorities
 */
function generateBigThree(
  ctx: PulseCortexContext,
  identityProfile: any,
  simulation: any
): string[] {
  const priorities: Array<{ text: string; score: number }> = [];

  // Identity transformation priority
  if (identityProfile.transformationArc) {
    priorities.push({
      text: `Transform toward ${identityProfile.transformationArc.to} archetype`,
      score: 90,
    });
  }

  // Strategic arc priority
  const arcs = ctx.domains.strategy?.arcs || [];
  if (arcs.length > 0) {
    const topArc = arcs[0];
    priorities.push({
      text: `Advance strategic arc: ${topArc.name}`,
      score: topArc.priority || 80,
    });
  }

  // Relationship priority
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const neglected = relationships.filter((p) => p.daysSinceInteraction > 30);
  if (neglected.length > 0) {
    priorities.push({
      text: `Reconnect with ${neglected.length} key relationships`,
      score: 75,
    });
  }

  // Financial priority
  const finance = ctx.domains.finance;
  if (finance?.cashflowProjection?.trend === "negative") {
    priorities.push({
      text: "Stabilize financial cashflow",
      score: 90,
    });
  }

  // Work priority
  const workQueue = ctx.domains.work?.queue || [];
  if (workQueue.length > 10) {
    priorities.push({
      text: "Focus on high-impact work tasks",
      score: 70,
    });
  }

  // Opportunity from simulation
  const opportunities = simulation.opportunityWindows || [];
  if (opportunities.length > 0) {
    const topOpp = opportunities[0];
    priorities.push({
      text: `Capitalize on: ${topOpp.description}`,
      score: 85,
    });
  }

  // Sort by score and return top 3
  return priorities
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((p) => p.text);
}

/**
 * Generate domain objectives
 */
async function generateDomainObjectives(
  ctx: PulseCortexContext,
  identityProfile: any
): Promise<DomainObjective[]> {
  const objectives: DomainObjective[] = [];

  // Work objectives
  const workQueue = ctx.domains.work?.queue || [];
  const highPriorityWork = workQueue
    .filter((item) => item.priority === "high" || item.priority === "urgent")
    .slice(0, 5);

  if (highPriorityWork.length > 0) {
    const workObjectives: PulseObjective[] = highPriorityWork.map((item) => ({
      id: uuidv4(),
      domain: "work",
      title: item.title,
      description: item.description,
      importance: item.priority === "urgent" ? 90 : 70,
      urgency: item.priority === "urgent" ? 90 : 70,
      estimatedMinutes: item.estimatedMinutes || 30,
    }));

    const workPlan = generateMicroPlan(workObjectives, ctx);
    const totalMinutes = workPlan.microSteps.reduce(
      (sum, step) => sum + step.estimatedMinutes,
      0
    );

    objectives.push({
      domain: "work",
      title: "High-priority work tasks",
      description: `${highPriorityWork.length} urgent/high-priority items`,
      microSteps: workPlan.microSteps,
      estimatedMinutes: totalMinutes,
      priority: 85,
    });
  }

  // Strategy objectives
  const arcs = ctx.domains.strategy?.arcs || [];
  if (arcs.length > 0) {
    const topArc = arcs[0];
    const strategyObjectives: PulseObjective[] = [
      {
        id: uuidv4(),
        domain: "strategy",
        title: `Advance arc: ${topArc.name}`,
        description: `Progress: ${Math.round(topArc.progress * 100)}%`,
        importance: 90,
        urgency: 70,
        estimatedMinutes: 60,
      },
    ];

    const strategyPlan = generateMicroPlan(strategyObjectives, ctx);
    objectives.push({
      domain: "strategy",
      title: `Strategic arc: ${topArc.name}`,
      description: topArc.name,
      microSteps: strategyPlan.microSteps,
      estimatedMinutes: 60,
      priority: 90,
    });
  }

  // Life objectives (habits)
  const habits = ctx.domains.life?.habits || [];
  const brokenHabits = habits.filter((h) => h.streak === 0);
  if (brokenHabits.length > 0) {
    const habitObjectives: PulseObjective[] = brokenHabits.slice(0, 3).map((habit) => ({
      id: uuidv4(),
      domain: "life",
      title: `Restart habit: ${habit.name}`,
      description: `Completion rate: ${Math.round(habit.completionRate * 100)}%`,
      importance: 60,
      urgency: 50,
      estimatedMinutes: 15,
    }));

    const habitPlan = generateMicroPlan(habitObjectives, ctx);
    objectives.push({
      domain: "life",
      title: "Habit recovery",
      description: `${brokenHabits.length} habits need attention`,
      microSteps: habitPlan.microSteps,
      estimatedMinutes: habitPlan.microSteps.reduce((sum, s) => sum + s.estimatedMinutes, 0),
      priority: 60,
    });
  }

  return objectives;
}

/**
 * Generate relationship touches
 */
function generateRelationshipTouches(
  relationships: Array<{ id: string; name: string; daysSinceInteraction: number; relationshipScore: number }>,
  ctx: PulseCortexContext
): RelationshipAction[] {
  const touches: RelationshipAction[] = [];

  // Prioritize relationships that need attention
  const prioritized = relationships
    .filter((p) => p.relationshipScore > 50)
    .sort((a, b) => {
      // Higher priority for high-value relationships that are neglected
      const aScore = a.relationshipScore * (a.daysSinceInteraction > 30 ? 2 : 1);
      const bScore = b.relationshipScore * (b.daysSinceInteraction > 30 ? 2 : 1);
      return bScore - aScore;
    })
    .slice(0, 7); // One per day

  for (let i = 0; i < prioritized.length; i++) {
    const person = prioritized[i];
    let action: RelationshipAction["action"] = "maintain";
    let priority = 50;

    if (person.daysSinceInteraction > 30) {
      action = "reconnect";
      priority = 80;
    } else if (person.daysSinceInteraction > 14) {
      action = "deepen";
      priority = 60;
    } else if (person.relationshipScore < 50) {
      action = "repair";
      priority = 90;
    }

    touches.push({
      personId: person.id,
      personName: person.name,
      action,
      priority,
      dayOfWeek: i, // Distribute across week
    });
  }

  return touches;
}

/**
 * Generate financial checkpoints
 */
function generateFinancialCheckpoints(ctx: PulseCortexContext): FinancialAction[] {
  const checkpoints: FinancialAction[] = [];

  const finance = ctx.domains.finance;
  if (!finance) return checkpoints;

  // Upcoming obligations
  const obligations = finance.upcomingObligations || [];
  for (const obligation of obligations.slice(0, 3)) {
    const dueDate = new Date(obligation.dueDate);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    if (dueDate <= weekEnd) {
      checkpoints.push({
        type: "payment",
        title: `Pay: ${obligation.title}`,
        description: `Due: ${obligation.dueDate}`,
        dueDate: obligation.dueDate,
        amount: obligation.amount,
        priority: 90,
      });
    }
  }

  // Weekly financial review
  checkpoints.push({
    type: "review",
    title: "Weekly financial review",
    description: "Review cashflow and upcoming obligations",
    priority: 70,
  });

  return checkpoints;
}

/**
 * Generate risk mitigations
 */
function generateRiskMitigations(simulation: any): WeeklyPlan["riskMitigations"] {
  const mitigations: WeeklyPlan["riskMitigations"] = [];

  const risks = simulation.riskWindows || [];
  for (const risk of risks.slice(0, 3)) {
    if (risk.severity === "high" || risk.severity === "medium") {
      // Create micro-steps for each mitigation strategy
      for (const mitigation of risk.mitigation.slice(0, 2)) {
        mitigations.push({
          id: uuidv4(),
          objectiveId: `risk_${risk.id}`,
          domain: risk.domain as any,
          title: `Mitigate: ${mitigation}`,
          estimatedMinutes: 30,
          energyRequired: "medium",
          source: "ef_generated",
          order: mitigations.length + 1,
        });
      }
    }
  }

  return mitigations;
}

/**
 * Generate opportunity moves
 */
function generateOpportunityMoves(simulation: any): WeeklyPlan["opportunityMoves"] {
  const moves: WeeklyPlan["opportunityMoves"] = [];

  const opportunities = simulation.opportunityWindows || [];
  for (const opp of opportunities.slice(0, 3)) {
    if (opp.priority === "high" || opp.priority === "medium") {
      // Create micro-steps for each suggested action
      for (const action of opp.suggestedActions.slice(0, 2)) {
        moves.push({
          id: uuidv4(),
          objectiveId: `opp_${opp.id}`,
          domain: opp.domain as any,
          title: `Capitalize: ${action}`,
          estimatedMinutes: 45,
          energyRequired: "medium",
          source: "ef_generated",
          order: moves.length + 1,
        });
      }
    }
  }

  return moves;
}

/**
 * Generate daily plans
 */
function generateDailyPlans(
  ctx: PulseCortexContext,
  identityArc: any,
  domainObjectives: DomainObjective[],
  relationshipTouches: RelationshipAction[],
  timeBlocks: TimeSliceBlock[]
): DailyPlan[] {
  const plans: DailyPlan[] = [];
  const weekStart = getWeekStart(new Date());

  for (let day = 0; day < 7; day++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + day);

    // Get relationship actions for this day
    const dayRelationshipActions = relationshipTouches.filter(
      (r) => r.dayOfWeek === day
    );

    // Get identity practice for this day
    const identityPractice = identityArc.dailyPractices[day] || identityArc.dailyPractices[0];

    // Get time blocks for this day
    const dayTimeBlocks = timeBlocks.filter((block) => {
      const blockDate = new Date(block.start);
      return (
        blockDate.getDate() === date.getDate() &&
        blockDate.getMonth() === date.getMonth() &&
        blockDate.getFullYear() === date.getFullYear()
      );
    });

    // Get tasks from domain objectives
    const dayTasks: MicroStep[] = [];
    for (const obj of domainObjectives) {
      // Distribute tasks across week
      const tasksPerDay = Math.ceil(obj.microSteps.length / 7);
      const startIdx = day * tasksPerDay;
      const endIdx = Math.min(startIdx + tasksPerDay, obj.microSteps.length);
      dayTasks.push(...obj.microSteps.slice(startIdx, endIdx));
    }

    // Determine focus for the day
    const focus = determineDayFocus(day, domainObjectives, relationshipTouches);

    // Estimate energy profile
    const energyProfile = estimateEnergyProfile(ctx, day);

    plans.push({
      date: date.toISOString(),
      dayOfWeek: date.toLocaleDateString("en-US", { weekday: "long" }),
      focus,
      timeBlocks: dayTimeBlocks,
      tasks: dayTasks,
      relationshipActions: dayRelationshipActions,
      identityPractices: identityPractice ? [identityPractice] : [],
      energyProfile,
    });
  }

  return plans;
}

/**
 * Determine day focus
 */
function determineDayFocus(
  day: number,
  domainObjectives: DomainObjective[],
  relationshipTouches: RelationshipAction[]
): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Monday: Work focus
  if (day === 1) {
    return "Work execution and high-priority tasks";
  }

  // Mid-week: Strategy and planning
  if (day === 2 || day === 3) {
    return "Strategic work and relationship building";
  }

  // Friday: Relationship and connection
  if (day === 5) {
    return "Relationship touches and connection";
  }

  // Weekend: Life and identity
  if (day === 0 || day === 6) {
    return "Identity practices and life maintenance";
  }

  return "Balanced focus across domains";
}

/**
 * Estimate energy profile for day
 */
function estimateEnergyProfile(
  ctx: PulseCortexContext,
  day: number
): DailyPlan["energyProfile"] {
  const currentEnergy = ctx.cognitiveProfile.currentEnergyLevel;

  // Use cognitive profile peak hours if available
  const peakHours = ctx.cognitiveProfile.peakHours || [9, 10, 11, 14, 15];

  // Morning: Usually high energy
  let morning: "low" | "medium" | "high" = "high";
  if (currentEnergy < 0.4) morning = "low";
  else if (currentEnergy < 0.7) morning = "medium";

  // Afternoon: Variable
  let afternoon: "low" | "medium" | "high" = "medium";
  if (peakHours.includes(14) || peakHours.includes(15)) afternoon = "high";
  if (currentEnergy < 0.3) afternoon = "low";

  // Evening: Usually lower
  let evening: "low" | "medium" | "high" = "low";
  if (currentEnergy > 0.7) evening = "medium";

  return { morning, afternoon, evening };
}

/**
 * Calculate mission alignment
 */
function calculateMissionAlignment(
  ctx: PulseCortexContext,
  identityProfile: any,
  bigThree: string[]
): WeeklyPlan["missionAlignment"] {
  // Simple alignment scoring based on identity and strategic arcs
  let alignmentScore = 0.5;

  // Check if Big Three align with identity
  const identityArchetype = identityProfile.currentArchetype;
  const bigThreeText = bigThree.join(" ").toLowerCase();

  if (bigThreeText.includes(identityArchetype) || bigThreeText.includes("identity")) {
    alignmentScore += 0.2;
  }

  // Check strategic arc alignment
  const arcs = ctx.domains.strategy?.arcs || [];
  if (arcs.length > 0) {
    alignmentScore += 0.2;
  }

  // Check relationship alignment
  const relationships = ctx.domains.relationships?.keyPeople || [];
  if (relationships.length > 0) {
    alignmentScore += 0.1;
  }

  alignmentScore = Math.min(1.0, alignmentScore);

  const alignmentTags: string[] = [];
  if (identityProfile.transformationArc) {
    alignmentTags.push("identity_transformation");
  }
  if (arcs.length > 0) {
    alignmentTags.push("strategic_arcs");
  }
  if (relationships.length > 0) {
    alignmentTags.push("relationship_focus");
  }

  return {
    alignmentScore,
    alignmentTags,
  };
}

/**
 * Get week start (Sunday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Subtract days to get to Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}



