// Mission Arc Builder v1
// lib/purpose/v1/arc-builder.ts

import { MissionArc, IdentityRole } from "./types";
import { PulseCortexContext } from "@/lib/cortex/types";
import { scanIdentity } from "@/lib/identity/v3";
import { runLifeSimulation } from "@/lib/simulation/v3/engine";

/**
 * Build enhanced mission arc with simulation insights
 */
export async function buildEnhancedMissionArc(
  userId: string,
  ctx: PulseCortexContext,
  durationDays: number
): Promise<MissionArc> {
  // Get identity profile
  const identityProfile = await scanIdentity(userId, ctx);

  // Run simulation to predict trajectory
  const simulation = await runLifeSimulation({
    userId,
    horizonDays: durationDays,
    scenarios: [
      {
        id: "mission_arc",
        title: "Mission Arc Trajectory",
        parameterAdjustments: {
          identityArchetype: identityProfile.currentArchetype,
        },
      },
    ],
    includeCausalModeling: true,
  });

  const scenario = simulation.scenarios[0];

  // Generate milestones from simulation
  const milestones = generateMilestonesFromSimulation(scenario, durationDays);

  // Generate identity roles
  const identityRoles: IdentityRole[] = [
    {
      archetype: identityProfile.currentArchetype,
      role: `Primary ${identityProfile.currentArchetype}`,
      weight: 0.9,
      practices: identityProfile.strengths.slice(0, 5),
    },
  ];

  if (identityProfile.secondaryArchetypes.length > 0) {
    identityRoles.push({
      archetype: identityProfile.secondaryArchetypes[0],
      role: `Supporting ${identityProfile.secondaryArchetypes[0]}`,
      weight: 0.4,
      practices: [],
    });
  }

  // Generate alignment indicators
  const alignmentIndicators = generateAlignmentIndicators(ctx, identityProfile, scenario);

  // Calculate progress
  const progress = calculateArcProgress(ctx, identityProfile, durationDays);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  return {
    title: `${durationDays}-Day ${identityProfile.currentArchetype} Mission Arc`,
    description: `Mission-driven arc toward ${identityProfile.currentArchetype} development`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    milestones,
    identityRoles,
    alignmentIndicators,
    progress,
  };
}

/**
 * Generate milestones from simulation
 */
function generateMilestonesFromSimulation(
  scenario: any,
  durationDays: number
): MissionArc["milestones"] {
  const milestones: MissionArc["milestones"] = [];

  // Use opportunity windows as milestones
  const opportunities = scenario.opportunityWindows || [];
  for (const opp of opportunities.slice(0, 3)) {
    const oppDate = new Date(opp.startDate);
    if (oppDate.getTime() < Date.now() + durationDays * 24 * 60 * 60 * 1000) {
      milestones.push({
        date: opp.startDate,
        description: `Capitalize on: ${opp.description}`,
        importance: opp.priority === "high" ? 90 : 70,
      });
    }
  }

  // Use predicted arcs as milestones
  const arcs = scenario.predictedArcs || [];
  for (const arc of arcs.slice(0, 2)) {
    milestones.push({
      date: arc.startDate,
      description: `${arc.type} arc: ${arc.description}`,
      importance: arc.confidence > 0.7 ? 85 : 70,
    });
  }

  // Add default milestones if needed
  if (milestones.length === 0) {
    const quarterPoint = durationDays / 4;
    milestones.push(
      {
        date: new Date(Date.now() + quarterPoint * 24 * 60 * 60 * 1000).toISOString(),
        description: "First quarter milestone",
        importance: 70,
      },
      {
        date: new Date(Date.now() + (durationDays / 2) * 24 * 60 * 60 * 1000).toISOString(),
        description: "Mid-point milestone",
        importance: 80,
      },
      {
        date: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
        description: "Arc completion milestone",
        importance: 90,
      }
    );
  }

  return milestones.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Generate alignment indicators
 */
function generateAlignmentIndicators(
  ctx: PulseCortexContext,
  identityProfile: any,
  scenario: any
): string[] {
  const indicators: string[] = [];

  // Identity alignment
  indicators.push(`Identity: ${identityProfile.currentArchetype}`);

  // Strategic alignment
  const arcs = ctx.domains.strategy?.arcs || [];
  if (arcs.length > 0) {
    indicators.push(`Strategic arcs: ${arcs.length} active`);
  }

  // Pattern alignment
  const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc"
  );
  if (productivityArcs.length > 0) {
    indicators.push("Productivity patterns aligned");
  }

  // Simulation alignment
  const improvingArcs = scenario.predictedArcs?.filter(
    (a: any) => a.trajectory === "improving"
  ) || [];
  if (improvingArcs.length > 0) {
    indicators.push(`${improvingArcs.length} improving trajectories`);
  }

  return indicators;
}

/**
 * Calculate arc progress
 */
function calculateArcProgress(
  ctx: PulseCortexContext,
  identityProfile: any,
  durationDays: number
): number {
  let progress = 0;

  // Use transformation arc progress if available
  if (identityProfile.transformationArc) {
    progress = identityProfile.transformationArc.progress;
  }

  // Adjust based on strategic arcs
  const arcs = ctx.domains.strategy?.arcs || [];
  if (arcs.length > 0) {
    const avgProgress = arcs.reduce((sum, a) => sum + (a.progress || 0), 0) / arcs.length;
    progress = (progress + avgProgress) / 2;
  }

  // Adjust based on time elapsed (if arc has started)
  // For now, assume arc just started
  progress = Math.max(0.1, progress); // At least 10% if arc exists

  return progress;
}



