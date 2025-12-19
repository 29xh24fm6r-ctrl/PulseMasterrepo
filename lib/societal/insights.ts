// Societal Insights - Experience v7
// lib/societal/insights.ts

import { getUserCohort } from "./cohorts";
import { getTwinModel } from "@/lib/twin/engine";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { callAIJson } from "@/lib/ai/call";

export interface SocietalInsight {
  title: string;
  body: string;
  type: "benchmark" | "warning" | "encouragement";
}

/**
 * Build societal insights for user
 */
export async function buildSocietalInsightsForUser(
  userId: string
): Promise<SocietalInsight[]> {
  // Get user's cohort
  const cohort = await getUserCohort(userId);
  if (!cohort) {
    return [];
  }

  // Get twin model
  const twin = await getTwinModel(userId);
  if (!twin) {
    return [];
  }

  // Get Cortex context
  const ctx = await getWorkCortexContextForUser(userId);

  // Generate insights
  const systemPrompt = `You are generating societal insights comparing a user to their cohort archetype.

Generate 3-5 insights:
- Benchmarks: How they compare to typical patterns for their archetype
- Warnings: Risks specific to their archetype
- Encouragement: Positive patterns they're following

Never show any other user's identity - only comparisons to banded norms.`;

  const userPrompt = `User's Archetype: ${cohort.archetype.name}
Archetype Description: ${cohort.archetype.description}
Archetype Strengths: ${JSON.stringify(cohort.archetype.strengths)}
Archetype Risks: ${JSON.stringify(cohort.archetype.risks)}

User's Current State:
- Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
- Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}
- Risk Patterns: ${JSON.stringify(twin.riskPatterns)}

Generate insights.`;

  const response = await callAIJson<{
    insights: Array<{
      title: string;
      body: string;
      type: "benchmark" | "warning" | "encouragement";
    }>;
  }>({
    userId,
    feature: "societal_insights",
    systemPrompt,
    userPrompt,
    maxTokens: 1000,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    // Fallback insights
    return [
      {
        title: "Archetype Match",
        body: `You're assigned to ${cohort.archetype.name}. People like you typically ${cohort.archetype.description}`,
        type: "benchmark" as const,
      },
    ];
  }

  return response.data.insights;
}



