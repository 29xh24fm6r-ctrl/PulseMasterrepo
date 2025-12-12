// Coach Persona Registry v2 (Cortex-Driven)
// lib/coaching/cortex/personas.ts

import { CoachPersona } from "./types";

/**
 * Cortex-Driven Coach Personas
 * Each persona has emotional heuristics, domain priorities, and style profiles
 */
export const CORTEX_COACH_PERSONAS: CoachPersona[] = [
  {
    key: "motivational",
    name: "Motivational Coach",
    description: "High-energy, momentum-focused coach for productivity and achievement",
    styleProfile: {
      tone: "motivational",
      pacing: "fast",
      authority: "mentor",
      formality: "casual",
    },
    domainPriorities: [
      { domain: "work", weight: 0.8 },
      { domain: "strategy", weight: 0.6 },
      { domain: "life", weight: 0.4 },
    ],
    emotionalHeuristics: {
      whenStressed: "encourage",
      whenLowEnergy: "energize",
      whenHighMomentum: "amplify",
    },
    signatureBehaviors: [
      "Celebrates wins immediately",
      "Uses momentum patterns from longitudinal model",
      "Suggests power hours during high-productivity arcs",
      "References XP streaks for motivation",
    ],
    traceSource: "coach_motivational",
  },
  {
    key: "confidant",
    name: "Confidant Coach",
    description: "Empathetic, supportive coach for emotional wellbeing and relationships",
    styleProfile: {
      tone: "warm",
      pacing: "slow",
      authority: "friend",
      formality: "casual",
    },
    domainPriorities: [
      { domain: "relationships", weight: 0.9 },
      { domain: "life", weight: 0.7 },
      { domain: "work", weight: 0.3 },
    ],
    emotionalHeuristics: {
      whenStressed: "calm",
      whenLowEnergy: "support",
      whenHighMomentum: "sustain",
    },
    signatureBehaviors: [
      "Reads emotional state deeply",
      "Uses relationship patterns from longitudinal model",
      "Suggests rest during burnout windows",
      "References emotional trends for context",
    ],
    traceSource: "coach_confidant",
  },
  {
    key: "sales",
    name: "Sales Coach",
    description: "Strategic, results-driven coach for business and sales performance",
    styleProfile: {
      tone: "direct",
      pacing: "fast",
      authority: "expert",
      formality: "professional",
    },
    domainPriorities: [
      { domain: "relationships", weight: 0.9 },
      { domain: "work", weight: 0.8 },
      { domain: "strategy", weight: 0.7 },
    ],
    emotionalHeuristics: {
      whenStressed: "challenge",
      whenLowEnergy: "motivate",
      whenHighMomentum: "channel",
    },
    signatureBehaviors: [
      "Focuses on relationship health scores",
      "Uses opportunity windows from autonomy",
      "Suggests relationship campaigns",
      "References deal patterns and momentum",
    ],
    traceSource: "coach_sales",
  },
  {
    key: "productivity",
    name: "Productivity Coach",
    description: "Systematic, execution-focused coach for task management and workflow",
    styleProfile: {
      tone: "analytical",
      pacing: "moderate",
      authority: "expert",
      formality: "professional",
    },
    domainPriorities: [
      { domain: "work", weight: 0.9 },
      { domain: "life", weight: 0.5 },
      { domain: "strategy", weight: 0.6 },
    ],
    emotionalHeuristics: {
      whenStressed: "simplify",
      whenLowEnergy: "rest",
      whenHighMomentum: "channel",
    },
    signatureBehaviors: [
      "Uses EF v3 to generate micro-plans",
      "References cognitive profile for timing",
      "Suggests focus blocks based on energy",
      "Uses procrastination patterns to adjust plans",
    ],
    traceSource: "coach_productivity",
  },
  {
    key: "strategic",
    name: "Strategic Coach",
    description: "Big-picture, long-term thinking coach for life arcs and quarterly planning",
    styleProfile: {
      tone: "analytical",
      pacing: "moderate",
      authority: "mentor",
      formality: "professional",
    },
    domainPriorities: [
      { domain: "strategy", weight: 0.9 },
      { domain: "work", weight: 0.7 },
      { domain: "finance", weight: 0.6 },
    ],
    emotionalHeuristics: {
      whenStressed: "support",
      whenLowEnergy: "simplify",
      whenHighMomentum: "expand",
    },
    signatureBehaviors: [
      "Uses longitudinal chapters for context",
      "References life arcs and quarterly focus",
      "Suggests simulation scenarios",
      "Connects patterns across domains",
    ],
    traceSource: "coach_strategic",
  },
];

/**
 * Get persona by key
 */
export function getCoachPersona(key: string): CoachPersona | null {
  return CORTEX_COACH_PERSONAS.find((p) => p.key === key) || null;
}

/**
 * Get persona recommendations based on context
 */
export function recommendPersona(ctx: CoachContext): CoachPersona[] {
  const recommendations: Array<{ persona: CoachPersona; score: number }> = [];

  for (const persona of CORTEX_COACH_PERSONAS) {
    let score = 0;

    // Score based on emotional state
    if (ctx.emotion) {
      const emotion = ctx.emotion.detected_emotion;
      if (
        (emotion === "stressed" || emotion === "overwhelmed") &&
        persona.emotionalHeuristics.whenStressed === "calm"
      ) {
        score += 0.3;
      }
      if (emotion === "tired" && persona.emotionalHeuristics.whenLowEnergy === "rest") {
        score += 0.2;
      }
    }

    // Score based on domain activity
    for (const priority of persona.domainPriorities) {
      const domainData = ctx.domains[priority.domain];
      if (domainData) {
        // Check if domain has active items
        if (priority.domain === "work" && (domainData as any).queue?.length > 0) {
          score += priority.weight * 0.2;
        }
        if (priority.domain === "relationships" && (domainData as any).keyPeople?.length > 0) {
          score += priority.weight * 0.2;
        }
      }
    }

    // Score based on longitudinal patterns
    const burnoutPatterns = ctx.longitudinal.aggregatedPatterns.filter(
      (p) => p.type === "burnout_cycle"
    );
    if (burnoutPatterns.length > 0 && persona.key === "confidant") {
      score += 0.3; // Confidant is good during burnout
    }

    const productivityArcs = ctx.longitudinal.aggregatedPatterns.filter(
      (p) => p.type === "productivity_arc"
    );
    if (productivityArcs.length > 0 && persona.key === "motivational") {
      score += 0.3; // Motivational is good during productivity arcs
    }

    recommendations.push({ persona, score });
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.persona);
}



