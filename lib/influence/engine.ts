// Influence Engine - Next Best Action Generation
// lib/influence/engine.ts

import { NextBestActionInput, NextBestActionResult, InfluenceChannel } from "./types";
import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

/**
 * Generate next best action for a contact
 */
export async function generateNextBestAction(
  input: NextBestActionInput
): Promise<NextBestActionResult> {
  const { userId, contactId, situation } = input;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load contact core info
  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("user_id", dbUserId)
    .single();

  if (!contact) {
    throw new Error("Contact not found");
  }

  // 2. Load behavior profile
  const { data: behaviorProfile } = await supabaseAdmin
    .from("contact_behavior_profiles")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .single();

  // 3. Load identity intel
  const { data: identityIntel } = await supabaseAdmin
    .from("contact_identity_intel")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .single();

  // 4. Load relationship scores
  const { data: relationshipScores } = await supabaseAdmin
    .from("contact_relationship_scores")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .single();

  // 5. Load recent interactions (last 10)
  const { data: recentInteractions } = await supabaseAdmin
    .from("contact_interaction_events")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false })
    .limit(10);

  // 6. Load open items
  const { data: openTasks } = await supabaseAdmin
    .from("email_tasks")
    .select("id, title, due_at, status")
    .eq("user_id", dbUserId)
    .in("status", ["open", "in_progress"])
    .limit(5);

  const { data: openPromises } = await supabaseAdmin
    .from("email_promises")
    .select("promise_text, promise_due_at, status")
    .eq("user_id", dbUserId)
    .eq("status", "open")
    .limit(5);

  // 7. Build LLM prompt
  const prompt = `You are Pulse, an AI assistant helping someone communicate more effectively with a contact.

Contact: ${contact.name || "Unknown"}
${contact.company ? `Company: ${contact.company}` : ""}
${contact.title ? `Title: ${contact.title}` : ""}

${situation ? `Current Situation: ${situation}` : ""}

Behavior Profile:
${behaviorProfile
  ? `
- Preferred Channel: ${behaviorProfile.prefers_channel || "mixed"}
- Escalation Channel: ${behaviorProfile.escalation_channel || "email"}
- Your Avg Response Time: ${behaviorProfile.avg_response_minutes ? Math.round(behaviorProfile.avg_response_minutes) + " minutes" : "unknown"}
- Their Avg Response Time: ${behaviorProfile.their_avg_response_minutes ? Math.round(behaviorProfile.their_avg_response_minutes) + " minutes" : "unknown"}
- Reliability Score: ${((behaviorProfile.reliability_score || 0.5) * 100).toFixed(0)}%
- Risk Score: ${((behaviorProfile.risk_score || 0.5) * 100).toFixed(0)}%
- Conflict Sensitivity: ${((behaviorProfile.conflict_sensitivity || 0.5) * 100).toFixed(0)}%
`
  : "No behavior profile yet."}

${identityIntel
  ? `
Identity Intel:
${identityIntel.summarised_identity || "No summary available."}
${identityIntel.inferred_communication_style ? `Communication Style: ${JSON.stringify(identityIntel.inferred_communication_style)}` : ""}
`
  : ""}

Relationship Scores:
${relationshipScores
  ? `
- Familiarity: ${((relationshipScores.familiarity_score || 0.5) * 100).toFixed(0)}%
- Trust: ${((relationshipScores.trust_score || 0.5) * 100).toFixed(0)}%
- Warmth: ${((relationshipScores.warmth_score || 0.5) * 100).toFixed(0)}%
- Influence: ${((relationshipScores.influence_score || 0.5) * 100).toFixed(0)}%
`
  : "No relationship scores yet."}

Recent Interactions (last 10):
${(recentInteractions || [])
  .map(
    (e) =>
      `- ${e.channel_type} (${e.direction}): ${e.emotion_label || "neutral"} sentiment, ${e.contains_conflict ? "conflict" : "no conflict"}`
  )
  .join("\n") || "No recent interactions."}

Open Items:
${openTasks && openTasks.length > 0
  ? `Tasks: ${openTasks.map((t) => t.title).join(", ")}`
  : ""}
${openPromises && openPromises.length > 0
  ? `Promises: ${openPromises.map((p) => p.promise_text).join(", ")}`
  : ""}

Given this person's behavior, identity, recent history, and current situation, suggest a single, concrete next communication step that maximizes positive impact and moves the relationship/goals forward.

Return JSON:
{
  "suggested_channel": "email" | "sms" | "call" | "in_person",
  "suggested_summary": "1-2 sentence summary of what to do",
  "suggested_message": "Full message text ready to send",
  "rationale": "Why this action is recommended",
  "confidence": 0.0-1.0
}

Be specific, actionable, and tailored to this person's communication style. Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 600,
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as NextBestActionResult;

    // Validate and normalize
    return {
      suggested_channel: (["email", "sms", "call", "in_person"].includes(parsed.suggested_channel)
        ? parsed.suggested_channel
        : "email") as InfluenceChannel,
      suggested_summary: parsed.suggested_summary || "Reach out to maintain connection.",
      suggested_message: parsed.suggested_message || "Hi, checking in. How are things?",
      rationale: parsed.rationale || "Based on communication patterns.",
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    };
  } catch (err) {
    console.error("[InfluenceEngine] LLM generation failed:", err);
    // Fallback
    return {
      suggested_channel: (behaviorProfile?.prefers_channel as InfluenceChannel) || "email",
      suggested_summary: "Reach out via their preferred channel to maintain connection.",
      suggested_message: `Hi ${contact.name || "there"}, checking in. How are things?`,
      rationale: "Based on preferred communication channel.",
      confidence: 0.5,
    };
  }
}

