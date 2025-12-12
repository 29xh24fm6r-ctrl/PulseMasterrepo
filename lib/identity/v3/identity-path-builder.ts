// Identity Path Builder v3
// lib/identity/v3/identity-path-builder.ts

import { IdentityProfile, IdentityArcPlan } from "./types";
import { PulseCortexContext } from "@/lib/cortex/types";
import { generateMicroPlan } from "@/lib/cortex/executive";
import { PulseObjective } from "@/lib/cortex/executive";
import { v4 as uuidv4 } from "uuid";

/**
 * Build identity arc plan for 30 days
 */
export function buildIdentityArcPlan(
  profile: IdentityProfile,
  ctx: PulseCortexContext,
  targetArchetype?: IdentityProfile["currentArchetype"]
): IdentityArcPlan {
  const archetype = targetArchetype || profile.currentArchetype;
  const duration = 30; // days

  // Generate daily practices
  const dailyPractices = generateDailyPractices(archetype, profile);

  // Generate weekly practices
  const weeklyPractices = generateWeeklyPractices(archetype, profile);

  // Generate challenges
  const challenges = generateChallenges(archetype, profile);

  // Generate milestones
  const milestones = generateMilestones(archetype, duration);

  // Generate narrative shift
  const narrativeShift = generateNarrativeShift(archetype, profile);

  // Convert to MicroSteps using EF
  const dailyObjectives: PulseObjective[] = dailyPractices.map((practice) => ({
    id: uuidv4(),
    domain: "life",
    title: practice,
    description: `Daily practice for ${archetype} archetype`,
    importance: 70,
    urgency: 50,
    estimatedMinutes: 15,
  }));

  const weeklyObjectives: PulseObjective[] = weeklyPractices.map((practice) => ({
    id: uuidv4(),
    domain: "life",
    title: practice,
    description: `Weekly practice for ${archetype} archetype`,
    importance: 80,
    urgency: 60,
    estimatedMinutes: 60,
  }));

  const challengeObjectives: PulseObjective[] = challenges.map((challenge) => ({
    id: uuidv4(),
    domain: "life",
    title: challenge,
    description: `Challenge to support ${archetype} archetype`,
    importance: 90,
    urgency: 70,
    estimatedMinutes: 30,
  }));

  // Generate micro-plans
  const dailyMicroPlan = generateMicroPlan(dailyObjectives, ctx);
  const weeklyMicroPlan = generateMicroPlan(weeklyObjectives, ctx);
  const challengeMicroPlan = generateMicroPlan(challengeObjectives, ctx);

  return {
    archetype,
    duration,
    dailyPractices: dailyMicroPlan.microSteps,
    weeklyPractices: weeklyMicroPlan.microSteps,
    challenges: challengeMicroPlan.microSteps,
    narrativeShift,
    milestones: milestones.map((m, i) => ({
      ...m,
      microStep: challengeMicroPlan.microSteps[i] || challengeMicroPlan.microSteps[0],
    })),
    metadata: {
      currentArchetype: profile.currentArchetype,
      transformationProgress: profile.transformationArc?.progress || 0,
      seasonalMode: profile.seasonalMode,
    },
  };
}

/**
 * Generate daily practices for archetype
 */
function generateDailyPractices(
  archetype: IdentityProfile["currentArchetype"],
  profile: IdentityProfile
): string[] {
  const practices: Record<IdentityProfile["currentArchetype"], string[]> = {
    warrior: [
      "Morning discipline routine",
      "Physical training or movement",
      "Confront one difficult task",
      "Evening reflection on battles won",
    ],
    strategist: [
      "Review strategic priorities",
      "Analyze one key decision",
      "Map connections between domains",
      "Plan tomorrow's strategic moves",
    ],
    creator: [
      "Creative practice session",
      "Capture new ideas",
      "Experiment with new approach",
      "Share one creation",
    ],
    builder: [
      "Build or improve one system",
      "Complete one construction task",
      "Document progress",
      "Plan next build phase",
    ],
    stoic: [
      "Morning meditation",
      "Practice acceptance",
      "Reflect on what's in your control",
      "Evening gratitude practice",
    ],
    leader: [
      "Connect with one person",
      "Practice influence skill",
      "Make one decision for the group",
      "Reflect on leadership impact",
    ],
    sage: [
      "Deep reading or study",
      "Contemplate wisdom",
      "Share insight with others",
      "Evening reflection on learning",
    ],
    explorer: [
      "Try something new",
      "Explore unfamiliar territory",
      "Document discoveries",
      "Plan next exploration",
    ],
    guardian: [
      "Protect or support someone",
      "Maintain boundaries",
      "Check on those you care for",
      "Reflect on protection provided",
    ],
    visionary: [
      "Envision future state",
      "Map path to vision",
      "Share vision with others",
      "Take one step toward vision",
    ],
  };

  return practices[archetype] || practices.strategist;
}

/**
 * Generate weekly practices
 */
function generateWeeklyPractices(
  archetype: IdentityProfile["currentArchetype"],
  profile: IdentityProfile
): string[] {
  const practices: Record<IdentityProfile["currentArchetype"], string[]> = {
    warrior: [
      "Weekly battle review",
      "Train with others",
      "Plan next campaign",
    ],
    strategist: [
      "Strategic review session",
      "Analyze long-term patterns",
      "Adjust strategic plan",
    ],
    creator: [
      "Deep creative work session",
      "Share portfolio",
      "Plan creative projects",
    ],
    builder: [
      "System architecture review",
      "Build major component",
      "Document system improvements",
    ],
    stoic: [
      "Extended meditation retreat",
      "Philosophy study session",
      "Practice detachment exercise",
    ],
    leader: [
      "Team connection session",
      "Leadership development",
      "Strategic influence planning",
    ],
    sage: [
      "Deep study session",
      "Teach or share wisdom",
      "Contemplate life questions",
    ],
    explorer: [
      "Major exploration adventure",
      "Document exploration findings",
      "Plan next exploration phase",
    ],
    guardian: [
      "Protection planning session",
      "Boundary maintenance review",
      "Support network check-in",
    ],
    visionary: [
      "Vision refinement session",
      "Share vision widely",
      "Build vision roadmap",
    ],
  };

  return practices[archetype] || practices.strategist;
}

/**
 * Generate challenges
 */
function generateChallenges(
  archetype: IdentityProfile["currentArchetype"],
  profile: IdentityProfile
): string[] {
  const challenges: Record<IdentityProfile["currentArchetype"], string[]> = {
    warrior: [
      "Face biggest fear this week",
      "Complete impossible-seeming task",
      "Defend important boundary",
    ],
    strategist: [
      "Solve complex strategic puzzle",
      "Make high-stakes decision",
      "Navigate multi-domain challenge",
    ],
    creator: [
      "Create something completely new",
      "Share vulnerable creation",
      "Break creative block",
    ],
    builder: [
      "Build something from scratch",
      "Improve existing system significantly",
      "Document and share build process",
    ],
    stoic: [
      "Practice acceptance in difficult situation",
      "Maintain calm in chaos",
      "Let go of attachment",
    ],
    leader: [
      "Lead through conflict",
      "Make unpopular but right decision",
      "Inspire others to action",
    ],
    sage: [
      "Deep dive into complex topic",
      "Share wisdom that challenges",
      "Question fundamental assumptions",
    ],
    explorer: [
      "Explore completely unknown territory",
      "Take calculated risk",
      "Document and share exploration",
    ],
    guardian: [
      "Protect someone in need",
      "Maintain difficult boundary",
      "Support through crisis",
    ],
    visionary: [
      "Envision and communicate bold future",
      "Take first step toward impossible vision",
      "Inspire others to see vision",
    ],
  };

  return challenges[archetype] || challenges.strategist;
}

/**
 * Generate milestones
 */
function generateMilestones(
  archetype: IdentityProfile["currentArchetype"],
  duration: number
): Array<{ day: number; description: string }> {
  return [
    { day: 7, description: `First week of ${archetype} practice complete` },
    { day: 14, description: `Two weeks: ${archetype} patterns emerging` },
    { day: 21, description: `Three weeks: ${archetype} identity solidifying` },
    { day: duration, description: `${archetype} arc complete - integration phase` },
  ];
}

/**
 * Generate narrative shift
 */
function generateNarrativeShift(
  archetype: IdentityProfile["currentArchetype"],
  profile: IdentityProfile
): string {
  const shifts: Record<IdentityProfile["currentArchetype"], string> = {
    warrior: "From avoiding conflict to facing challenges with courage and discipline",
    strategist: "From reactive to proactive, seeing patterns and making calculated moves",
    creator: "From consuming to creating, expressing unique vision and voice",
    builder: "From chaos to order, constructing systems that last",
    stoic: "From emotional reactivity to calm acceptance and inner peace",
    leader: "From individual achievement to collective impact and influence",
    sage: "From knowledge to wisdom, from learning to understanding",
    explorer: "From comfort zone to discovery, from known to unknown",
    guardian: "From self-focus to protection and support of others",
    visionary: "From present constraints to future possibilities",
  };

  return shifts[archetype] || shifts.strategist;
}



