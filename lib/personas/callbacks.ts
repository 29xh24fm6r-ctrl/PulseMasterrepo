// Persona Companion Callbacks & Highlights
// lib/personas/callbacks.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

export interface CompanionHighlight {
  id: string;
  summary: string;
  highlightType: string;
  importance: number;
  createdAt: string;
}

/**
 * Consider capturing a highlight from interaction
 */
export async function considerHighlightFromInteraction(params: {
  userId: string;
  personaId: string;
  coachId?: string;
  transcript: string;          // conversation snippet or summary
  outcomeTag?: string;
  arcContext?: any;            // life arc id + type
}): Promise<void> {
  const { userId, personaId, coachId, transcript, outcomeTag, arcContext } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!userRow) return;

  const dbUserId = userRow.id;

  // Use LLM to determine if this is highlight-worthy and generate safe summary
  const highlightPrompt = `Analyze this conversation snippet and determine if it contains a meaningful highlight worth remembering:

Conversation: "${transcript}"
Outcome: ${outcomeTag || "neutral"}
Context: ${arcContext ? JSON.stringify(arcContext) : "none"}

A highlight is worth capturing if it's:
- A significant win or breakthrough
- A meaningful commitment or promise
- A recurring pattern or insight
- A key struggle that shaped understanding

If it's highlight-worthy, output JSON:
{
  "isHighlight": true,
  "highlightType": "win" | "struggle" | "insight" | "promise" | "pattern",
  "summary": "Short, safe, non-creepy summary (max 100 chars)",
  "importance": 1-5
}

If not highlight-worthy, output:
{
  "isHighlight": false
}

Safety rules:
- Never include personal details that could be sensitive
- Keep summaries brief and general
- Avoid absolute language like "always" or "never"
- Focus on what happened, not judgments`;

  try {
    const response = await llmComplete(highlightPrompt, {
      model: "gpt-4o-mini",
      temperature: 0.5,
      json: true,
      max_tokens: 200,
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    if (!parsed.isHighlight) return;

    // Check if we're at the limit (50 per persona)
    const { count } = await supabaseAdmin
      .from("persona_companion_highlights")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .eq("persona_id", personaId)
      .eq("coach_id", coachId || null);

    if (count && count >= 50) {
      // Remove oldest low-importance highlight
      const { data: oldest } = await supabaseAdmin
        .from("persona_companion_highlights")
        .select("id")
        .eq("user_id", dbUserId)
        .eq("persona_id", personaId)
        .eq("coach_id", coachId || null)
        .order("importance", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (oldest) {
        await supabaseAdmin
          .from("persona_companion_highlights")
          .delete()
          .eq("id", oldest.id);
      }
    }

    // Save highlight
    await supabaseAdmin.from("persona_companion_highlights").insert({
      user_id: dbUserId,
      persona_id: personaId,
      coach_id: coachId || null,
      highlight_type: parsed.highlightType,
      summary: parsed.summary,
      importance: Math.max(1, Math.min(5, parsed.importance || 3)),
    });
  } catch (err) {
    console.error(`[CompanionCallbacks] Failed to process highlight:`, err);
    // Don't fail the interaction if highlight capture fails
  }
}

/**
 * Get relevant highlights for context
 */
export async function getRelevantHighlights(params: {
  userId: string;
  personaId: string;
  coachId?: string;
  contextTags?: string[];   // 'career', 'relationship', etc.
  limit?: number;
}): Promise<CompanionHighlight[]> {
  const { userId, personaId, coachId, contextTags, limit = 3 } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!userRow) return [];

  const dbUserId = userRow.id;

  // Build query
  let query = supabaseAdmin
    .from("persona_companion_highlights")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("persona_id", personaId)
    .eq("coach_id", coachId || null)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: highlights } = await query;

  if (!highlights) return [];

  return highlights.map((h) => ({
    id: h.id,
    summary: h.summary,
    highlightType: h.highlight_type,
    importance: h.importance,
    createdAt: h.created_at,
  }));
}




