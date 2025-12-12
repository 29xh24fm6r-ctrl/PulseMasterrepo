// Societal Cohort Engine - Experience v7
// lib/societal/cohorts.ts

import { supabaseAdmin } from "@/lib/supabase";
import { TwinModel } from "@/lib/twin/engine";
import { callAIJson } from "@/lib/ai/call";

export interface CohortAssignment {
  archetypeCode: string;
  confidence: number;
}

/**
 * Assign user to cohort
 */
export async function assignUserToCohort(
  userId: string,
  twin: TwinModel
): Promise<CohortAssignment> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get available archetypes
  const { data: archetypes } = await supabaseAdmin
    .from("cohort_archetypes")
    .select("*");

  if (!archetypes || archetypes.length === 0) {
    throw new Error("No archetypes found");
  }

  // Use LLM to assign
  const systemPrompt = `You are assigning a user to a cohort archetype based on their AI Twin model.

Available archetypes:
${archetypes.map((a) => `- ${a.code}: ${a.name} - ${a.description}`).join("\n")}

Choose the closest match and provide confidence (0-1).`;

  const userPrompt = `User Twin Model:
- Strengths: ${JSON.stringify(twin.strengths)}
- Weaknesses: ${JSON.stringify(twin.weaknesses)}
- Risk Patterns: ${JSON.stringify(twin.riskPatterns)}
- Decision Patterns: ${JSON.stringify(twin.decisionPatterns)}
- Values: ${JSON.stringify(twin.values)}

Assign to archetype.`;

  const response = await callAIJson<{
    archetypeCode: string;
    confidence: number;
  }>({
    userId,
    feature: "cohort_assignment",
    systemPrompt,
    userPrompt,
    maxTokens: 200,
    temperature: 0.3,
  });

  if (!response.success || !response.data) {
    // Fallback to first archetype
    return {
      archetypeCode: archetypes[0].code,
      confidence: 0.5,
    };
  }

  const assignment = response.data;

  // Find archetype ID
  const archetype = archetypes.find((a) => a.code === assignment.archetypeCode);
  if (!archetype) {
    throw new Error("Archetype not found");
  }

  // Upsert assignment
  await supabaseAdmin
    .from("user_cohort_assignments")
    .upsert(
      {
        user_id: dbUserId,
        archetype_id: archetype.id,
        confidence: assignment.confidence,
        assigned_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  return assignment;
}

/**
 * Get user's cohort assignment
 */
export async function getUserCohort(userId: string): Promise<{
  archetype: any;
  confidence: number;
} | null> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const { data: assignment } = await supabaseAdmin
    .from("user_cohort_assignments")
    .select("*, cohort_archetypes:archetype_id(*)")
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!assignment) {
    return null;
  }

  return {
    archetype: assignment.cohort_archetypes,
    confidence: assignment.confidence,
  };
}



