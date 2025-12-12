// lib/mythic/extract.ts

import { callAIJson } from "@/lib/ai/call";

export interface ExtractedMythicArtifacts {
  summary: string;
  quests: Array<{
    title: string;
    description?: string;
    difficulty?: number;
    reward_xp?: number;
  }>;
  shadow: string | null;
  act: 1 | 2 | 3 | 4 | 5;
  identity_claim: string | null;
  transformation: string | null;
  canon_title: string | null;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a mythic story analyst. You analyze personal narratives to extract the underlying hero's journey structure, identifying acts, trials, shadows, and transformation moments.

You respond ONLY with valid JSON matching this exact schema:
{
  "summary": "1-2 sentence summary of what happened or what the person is processing",
  "quests": [{"title": "string", "description": "string"}],
  "shadow": "string | null",
  "act": 1-5,
  "identity_claim": "string | null",
  "transformation": "string | null",
  "canon_title": "string | null"
}

RULES:
- summary: 1-2 sentences max, capture the essence
- quests: 1-3 concrete, actionable quests that could be done this week. Each quest should be small enough to be achievable.
- shadow: A single phrase describing resistance/avoidance pattern (e.g., "avoidance of conflict", "perfectionism", "fear of rejection") or null
- act: Integer 1-5 based on hero's journey stage:
  * 1 = Call (beginning, invitation to change)
  * 2 = Trial of Load (facing obstacles, building skills)
  * 3 = Descent & Decision (deep challenge, crucial choice)
  * 4 = Transformation (major shift, breakthrough)
  * 5 = Return & Legacy (integration, wisdom, sharing)
- identity_claim: A statement about who they are becoming or claiming (e.g., "I am a builder", "I am present") or null
- transformation: A brief description of what's shifting (e.g., "from solo operator to team builder") or null
- canon_title: A memorable title for this moment in their story or null

Be precise. Return valid JSON only - no markdown, no code blocks.`;

/**
 * Extract mythic artifacts from a transcript using LLM
 */
export async function extractMythicArtifacts(
  userId: string,
  transcript: string
): Promise<ExtractedMythicArtifacts | null> {
  if (!transcript || transcript.trim().length < 20) {
    return null;
  }

  const userPrompt = `Analyze this personal narrative transcript and extract mythic artifacts:

${transcript.substring(0, 4000)}`;

  try {
    const result = await callAIJson<ExtractedMythicArtifacts>({
      userId,
      feature: "mythic_extraction",
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.3, // Low temperature for consistency
      maxTokens: 800,
      jsonMode: true,
    });

    if (!result.success || !result.data) {
      console.warn("[Mythic Extract] LLM call failed:", result.error);
      return null;
    }

    // Validate act is in range
    const act = result.data.act;
    if (act < 1 || act > 5) {
      result.data.act = 1; // Default to Act I if invalid
    }

    // Ensure quests array exists and has valid structure
    if (!Array.isArray(result.data.quests)) {
      result.data.quests = [];
    } else {
      result.data.quests = result.data.quests.slice(0, 3).map((q) => ({
        title: q.title || "Untitled quest",
        description: q.description || undefined,
        difficulty: q.difficulty || 2,
        reward_xp: q.reward_xp || 100,
      }));
    }

    return result.data;
  } catch (error: any) {
    console.error("[Mythic Extract] Error:", error);
    return null;
  }
}

