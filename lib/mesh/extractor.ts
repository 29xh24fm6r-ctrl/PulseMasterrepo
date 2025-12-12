// Collective Intelligence Mesh - Extractor - Experience v10
// lib/mesh/extractor.ts

import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson } from "@/lib/ai/call";

export interface CollectivePattern {
  patternCode: string;
  description: string;
  extractedFrom: number; // number of users
  strengths: string[];
  risks: string[];
  recommendedProtocols: string[];
}

/**
 * Extract collective patterns from anonymized data
 * This would run periodically (e.g., daily/weekly) as a background job
 */
export async function extractCollectivePatterns(): Promise<CollectivePattern[]> {
  // Aggregate anonymized metrics
  // Note: In production, this would query aggregated/anonymized data only
  // Never expose individual user data

  // Example aggregated queries (would be more sophisticated in production):
  const { count: totalUsers } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  // Get aggregated habit consistency (anonymized)
  // Get aggregated deep work averages (anonymized)
  // Get aggregated burnout recovery patterns (anonymized)
  // Get aggregated success pathways per archetype (anonymized)

  // For now, generate patterns using LLM based on general knowledge
  const systemPrompt = `You are extracting collective patterns from anonymized human behavior data.

Generate patterns that represent:
- Deep work averages
- Habit consistency patterns
- Burnout recovery patterns
- Success pathways for different archetypes

Each pattern should have:
- Pattern code (unique identifier)
- Description
- Strengths (what this pattern enables)
- Risks (what to watch for)
- Recommended protocols (how to adopt this pattern)

Never reference individual users - only aggregate patterns.`;

  const userPrompt = `Extract collective patterns from anonymized data representing ${totalUsers || 0} users.

Generate 5-10 patterns that represent common successful pathways.`;

  const response = await callAIJson<{
    patterns: Array<{
      patternCode: string;
      description: string;
      strengths: string[];
      risks: string[];
      recommendedProtocols: string[];
    }>;
  }>({
    userId: "system", // System-level operation
    feature: "collective_extraction",
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    return [];
  }

  const patterns: CollectivePattern[] = response.data.patterns.map((p) => ({
    ...p,
    extractedFrom: totalUsers || 0,
  }));

  // Store patterns
  for (const pattern of patterns) {
    await supabaseAdmin
      .from("collective_patterns")
      .upsert(
        {
          pattern_code: pattern.patternCode,
          description: pattern.description,
          extracted_from: pattern.extractedFrom,
          strengths: pattern.strengths,
          risks: pattern.risks,
          recommended_protocols: pattern.recommendedProtocols,
        },
        {
          onConflict: "pattern_code",
        }
      );
  }

  return patterns;
}



