// Collective Intelligence Mesh - Alignment - Experience v10
// lib/mesh/alignment.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getTwinModel } from "@/lib/twin/engine";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import { callAIJson } from "@/lib/ai/call";

export interface UserCollectiveAlignment {
  patternCode: string;
  fitScore: number;
  description: string;
  strengths: string[];
  recommendedProtocols: string[];
}

/**
 * Compute user's alignment with collective patterns
 */
export async function computeUserCollectiveAlignment(
  userId: string
): Promise<UserCollectiveAlignment[]> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Get all collective patterns
  const { data: patterns } = await supabaseAdmin.from("collective_patterns").select("*");

  if (!patterns || patterns.length === 0) {
    return [];
  }

  // Get user's TwinModel
  const twin = await getTwinModel(userId);
  if (!twin) {
    return [];
  }

  // Get Cortex context
  const ctx = await buildPulseCortexContext(userId);

  // Compute alignment for each pattern
  const systemPrompt = `You are computing how well a user aligns with collective patterns.

For each pattern, compute:
- Fit score (0-1, how well user matches this pattern)
- Why they align (specific reasons)
- Which strengths apply
- Which protocols they should adopt

Be specific and actionable.`;

  const userPrompt = `User Twin:
- Strengths: ${JSON.stringify(twin.strengths)}
- Weaknesses: ${JSON.stringify(twin.weaknesses)}
- Risk Patterns: ${JSON.stringify(twin.riskPatterns)}
- Values: ${JSON.stringify(twin.values)}

Current State:
- Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
- Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}

Collective Patterns:
${JSON.stringify(patterns.slice(0, 10))}

Compute alignment scores.`;

  const response = await callAIJson<{
    alignments: Array<{
      patternCode: string;
      fitScore: number;
      description: string;
      strengths: string[];
      recommendedProtocols: string[];
    }>;
  }>({
    userId,
    feature: "collective_alignment",
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    return [];
  }

  const alignments = response.data.alignments
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3); // Top 3

  // Store alignments
  for (const alignment of alignments) {
    await supabaseAdmin
      .from("user_collective_alignment")
      .upsert(
        {
          user_id: dbUserId,
          pattern_code: alignment.patternCode,
          fit_score: alignment.fitScore,
        },
        {
          onConflict: "user_id,pattern_code",
        }
      );
  }

  return alignments;
}



