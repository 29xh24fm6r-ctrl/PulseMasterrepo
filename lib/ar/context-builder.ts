// AR Context Builder - Minimal Cortex Dataset for AR
// lib/ar/context-builder.ts

import { buildPulseCortexContext } from "@/lib/cortex/types";
import { PulseCortexContext } from "@/lib/cortex/types";

export interface ARContext {
  todaysState: {
    emotion: string;
    intensity: number;
    energy: number;
  };
  priorities: Array<{ id: string; title: string; priority: number }>;
  energyCurve: Array<{ time: string; level: number }>;
  relationshipTouch: {
    id: string;
    name: string;
    strength: number;
    action: string;
  } | null;
  opportunity: {
    id: string;
    title: string;
    description: string;
  } | null;
  risk: {
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
  } | null;
}

/**
 * Build minimal AR context from Cortex
 */
export async function buildARContext(userId: string): Promise<ARContext> {
  const ctx = await buildPulseCortexContext(userId);

  // Extract today's state
  const todaysState = {
    emotion: ctx.emotion?.detected_emotion || "neutral",
    intensity: ctx.emotion?.intensity || 0.5,
    energy: ctx.cognitiveProfile?.currentEnergyLevel || 0.5,
  };

  // Extract priorities
  const priorities = (ctx.domains.strategy?.currentQuarterFocus?.bigThree || []).map(
    (title, i) => ({
      id: `priority_${i}`,
      title,
      priority: 0.9 - i * 0.1,
    })
  );

  // Generate energy curve (simplified)
  const energyCurve: Array<{ time: string; level: number }> = [];
  const currentEnergy = ctx.cognitiveProfile?.currentEnergyLevel || 0.5;
  for (let hour = 6; hour <= 22; hour += 2) {
    // Simulate energy curve (morning high, afternoon dip, evening low)
    let level = currentEnergy;
    if (hour >= 6 && hour < 12) {
      level = Math.min(1, currentEnergy + 0.2);
    } else if (hour >= 12 && hour < 18) {
      level = Math.max(0.3, currentEnergy - 0.1);
    } else {
      level = Math.max(0.2, currentEnergy - 0.2);
    }
    energyCurve.push({
      time: `${hour}:00`,
      level,
    });
  }

  // Extract relationship touch
  const relationships = ctx.domains.relationships?.keyPeople || [];
  const relationshipTouch = relationships
    .filter((p) => p.daysSinceInteraction > 30 && p.daysSinceInteraction < 60)
    .sort((a, b) => b.relationshipScore - a.relationshipScore)[0];

  const relationshipTouchData = relationshipTouch
    ? {
        id: relationshipTouch.id,
        name: relationshipTouch.name,
        strength: relationshipTouch.relationshipScore,
        action: "Reconnect",
      }
    : null;

  // Extract opportunity
  const opportunities = ctx.longitudinal.aggregatedPatterns.filter(
    (p) => p.type === "productivity_arc" && p.strength > 0.7
  );
  const opportunity = opportunities.length > 0
    ? {
        id: "opp_1",
        title: "High Productivity Window",
        description: "You're in a productivity arc - great time to tackle important work",
      }
    : null;

  // Extract risk
  const risks = ctx.longitudinal.aggregatedPatterns.filter((p) => p.type === "burnout_cycle");
  const risk = risks.length > 0
    ? {
        id: "risk_1",
        title: "Burnout Risk",
        description: "Burnout patterns detected - prioritize rest",
        severity: "high" as const,
      }
    : null;

  return {
    todaysState,
    priorities,
    energyCurve,
    relationshipTouch: relationshipTouchData,
    opportunity,
    risk,
  };
}



