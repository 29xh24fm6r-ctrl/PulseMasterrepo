// Time Slicing Engine v1
// lib/time-slicing/v1/tse.ts

import { PulseCortexContext } from "@/lib/cortex/types";
import { TimeSliceBlock, TimeSliceAllocation, TimeSliceOptimization } from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate optimized time slices for the week
 */
export function generateTimeSlices(ctx: PulseCortexContext): TimeSliceBlock[] {
  const slices: TimeSliceBlock[] = [];
  const weekStart = getWeekStart(new Date());

  // Get cognitive profile
  const peakHours = ctx.cognitiveProfile.peakHours || [9, 10, 11, 14, 15];
  const currentEnergy = ctx.cognitiveProfile.currentEnergyLevel;
  const preferredTaskLength = ctx.cognitiveProfile.preferredTaskLength || 60;

  // Calculate domain time allocations
  const allocations = calculateDomainAllocations(ctx);

  // Generate slices for each day
  for (let day = 0; day < 7; day++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + day);

    // Morning blocks (identity alignment + high-energy work)
    const morningBlocks = generateMorningBlocks(date, ctx, peakHours, allocations);
    slices.push(...morningBlocks);

    // Afternoon blocks (productivity windows)
    const afternoonBlocks = generateAfternoonBlocks(
      date,
      ctx,
      peakHours,
      allocations,
      preferredTaskLength
    );
    slices.push(...afternoonBlocks);

    // Evening blocks (relationships, connection, recovery)
    const eveningBlocks = generateEveningBlocks(date, ctx, allocations);
    slices.push(...eveningBlocks);
  }

  return slices;
}

/**
 * Calculate domain time allocations
 */
function calculateDomainAllocations(ctx: PulseCortexContext): Record<string, number> {
  const allocations: Record<string, number> = {
    work: 0,
    relationships: 0,
    finance: 0,
    life: 0,
    strategy: 0,
  };

  // Work allocation based on queue size
  const workQueue = ctx.domains.work?.queue || [];
  const workMinutes = workQueue.length * 30; // Rough estimate
  allocations.work = Math.min(workMinutes, 40 * 60); // Cap at 40 hours/week

  // Relationship allocation
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const relationshipMinutes = relationships.length * 15; // 15 min per person
  allocations.relationships = Math.min(relationshipMinutes, 5 * 60); // Cap at 5 hours/week

  // Strategy allocation
  const arcs = ctx.domains.strategy?.arcs || [];
  allocations.strategy = arcs.length > 0 ? 3 * 60 : 0; // 3 hours/week if active

  // Life allocation (habits, identity practices)
  const habits = ctx.domains.life?.habits || [];
  allocations.life = habits.length * 20; // 20 min per habit

  // Finance allocation
  const finance = ctx.domains.finance;
  allocations.finance = finance ? 1 * 60 : 0; // 1 hour/week

  return allocations;
}

/**
 * Generate morning blocks (identity alignment + high-energy work)
 */
function generateMorningBlocks(
  date: Date,
  ctx: PulseCortexContext,
  peakHours: number[],
  allocations: Record<string, number>
): TimeSliceBlock[] {
  const blocks: TimeSliceBlock[] = [];

  // Identity practice block (if identity arc exists)
  const identityProfile = ctx.longitudinal.chapters[ctx.longitudinal.chapters.length - 1];
  if (identityProfile) {
    const identityStart = new Date(date);
    identityStart.setHours(7, 0, 0, 0);

    blocks.push({
      id: uuidv4(),
      domain: "life",
      start: identityStart.toISOString(),
      end: new Date(identityStart.getTime() + 15 * 60 * 1000).toISOString(),
      duration: 15,
      intensity: 0.6,
      identityMode: "morning_alignment",
      energyRequired: "low",
      description: "Morning identity practice",
    });
  }

  // High-energy work block (if morning is peak time)
  if (peakHours.includes(9) || peakHours.includes(10)) {
    const workStart = new Date(date);
    workStart.setHours(9, 0, 0, 0);

    const workDuration = Math.min(120, allocations.work / 5); // Distribute across week

    blocks.push({
      id: uuidv4(),
      domain: "work",
      start: workStart.toISOString(),
      end: new Date(workStart.getTime() + workDuration * 60 * 1000).toISOString(),
      duration: workDuration,
      intensity: 0.9,
      energyRequired: "high",
      description: "Deep work block",
    });
  }

  return blocks;
}

/**
 * Generate afternoon blocks (productivity windows)
 */
function generateAfternoonBlocks(
  date: Date,
  ctx: PulseCortexContext,
  peakHours: number[],
  allocations: Record<string, number>,
  preferredTaskLength: number
): TimeSliceBlock[] {
  const blocks: TimeSliceBlock[] = [];

  // Check if afternoon has peak hours
  const hasAfternoonPeak = peakHours.some((h) => h >= 13 && h <= 17);

  if (hasAfternoonPeak) {
    // Strategy block (mid-week afternoons)
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 2 && dayOfWeek <= 4 && allocations.strategy > 0) {
      const strategyStart = new Date(date);
      strategyStart.setHours(14, 0, 0, 0);

      blocks.push({
        id: uuidv4(),
        domain: "strategy",
        start: strategyStart.toISOString(),
        end: new Date(strategyStart.getTime() + 60 * 60 * 1000).toISOString(),
        duration: 60,
        intensity: 0.7,
        energyRequired: "medium",
        description: "Strategic planning block",
      });
    }

    // Work block
    if (allocations.work > 0) {
      const workStart = new Date(date);
      workStart.setHours(13, 0, 0, 0);

      const workDuration = Math.min(preferredTaskLength, allocations.work / 5);

      blocks.push({
        id: uuidv4(),
        domain: "work",
        start: workStart.toISOString(),
        end: new Date(workStart.getTime() + workDuration * 60 * 1000).toISOString(),
        duration: workDuration,
        intensity: 0.8,
        energyRequired: "medium",
        description: "Productivity block",
      });
    }
  }

  return blocks;
}

/**
 * Generate evening blocks (relationships, connection, recovery)
 */
function generateEveningBlocks(
  date: Date,
  ctx: PulseCortexContext,
  allocations: Record<string, number>
): TimeSliceBlock[] {
  const blocks: TimeSliceBlock[] = [];

  const dayOfWeek = date.getDay();

  // Relationship blocks (Friday evenings, weekend)
  if ((dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) && allocations.relationships > 0) {
    const relationshipStart = new Date(date);
    relationshipStart.setHours(18, 0, 0, 0);

    blocks.push({
      id: uuidv4(),
      domain: "relationships",
      start: relationshipStart.toISOString(),
      end: new Date(relationshipStart.getTime() + 30 * 60 * 1000).toISOString(),
      duration: 30,
      intensity: 0.5,
      energyRequired: "low",
      description: "Relationship connection time",
    });
  }

  // Recovery block (evening wind-down)
  const recoveryStart = new Date(date);
  recoveryStart.setHours(20, 0, 0, 0);

  blocks.push({
    id: uuidv4(),
    domain: "life",
    start: recoveryStart.toISOString(),
    end: new Date(recoveryStart.getTime() + 30 * 60 * 1000).toISOString(),
    duration: 30,
    intensity: 0.2,
    energyRequired: "low",
    description: "Evening recovery and reflection",
  });

  return blocks;
}

/**
 * Get week start (Sunday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate time slice optimization
 */
export function generateTimeSliceOptimization(
  ctx: PulseCortexContext
): TimeSliceOptimization {
  const slices = generateTimeSlices(ctx);
  const allocations = calculateDomainAllocations(ctx);

  // Group slices by domain
  const domainSlices: Record<string, TimeSliceBlock[]> = {};
  for (const slice of slices) {
    if (!domainSlices[slice.domain]) {
      domainSlices[slice.domain] = [];
    }
    domainSlices[slice.domain].push(slice);
  }

  // Calculate allocations
  const timeAllocations: TimeSliceAllocation[] = Object.entries(allocations).map(
    ([domain, weeklyMinutes]) => {
      const domainSliceBlocks = domainSlices[domain] || [];
      const dailyAverage = weeklyMinutes / 7;

      // Calculate distribution by day
      const distribution: Array<{ day: number; minutes: number }> = [];
      for (let day = 0; day < 7; day++) {
        const daySlices = domainSliceBlocks.filter((s) => {
          const sliceDate = new Date(s.start);
          return sliceDate.getDay() === day;
        });
        const dayMinutes = daySlices.reduce((sum, s) => sum + s.duration, 0);
        distribution.push({ day, minutes: dayMinutes });
      }

      return {
        domain,
        weeklyMinutes,
        dailyAverage,
        distribution,
      };
    }
  );

  // Identify focus blocks (high intensity, high energy)
  const focusBlocks = slices.filter(
    (s) => s.intensity > 0.7 && s.energyRequired === "high"
  );

  // Identify flow-state windows (peak hours, high intensity)
  const flowStateWindows = slices.filter(
    (s) => {
      const hour = new Date(s.start).getHours();
      const peakHours = ctx.cognitiveProfile.peakHours || [];
      return peakHours.includes(hour) && s.intensity > 0.8;
    }
  );

  // Identify recovery periods (low intensity, low energy)
  const recoveryPeriods = slices.filter(
    (s) => s.intensity < 0.4 && s.energyRequired === "low"
  );

  // Calculate weekly distribution
  const weeklyDistribution: Record<string, number> = {};
  for (const allocation of timeAllocations) {
    weeklyDistribution[allocation.domain] = allocation.weeklyMinutes;
  }

  return {
    allocations: timeAllocations,
    focusBlocks,
    flowStateWindows,
    recoveryPeriods,
    weeklyDistribution,
  };
}



