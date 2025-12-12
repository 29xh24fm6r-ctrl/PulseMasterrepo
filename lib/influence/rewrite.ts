// Influence Engine - Message Rewriter
// lib/influence/rewrite.ts

import { RewriteMessageInput, RewriteMessageResult } from "./types";
import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

/**
 * Rewrite message to match contact's communication style
 */
export async function rewriteMessageForContact(
  input: RewriteMessageInput
): Promise<RewriteMessageResult> {
  const { userId, contactId, originalMessage, intent } = input;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load contact info
  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("name")
    .eq("id", contactId)
    .eq("user_id", dbUserId)
    .single();

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

  // 4. Load playbook
  const { data: playbook } = await supabaseAdmin
    .from("contact_playbooks")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .single();

  // 5. Build LLM prompt
  const prompt = `You are Pulse, an AI assistant helping someone rewrite a message to match a contact's communication style.

Contact: ${contact?.name || "Unknown"}

Intent: ${intent}

Original Message:
${originalMessage}

${behaviorProfile
  ? `
Communication Preferences:
- Brevity: ${((behaviorProfile.brevity_preference || 0.5) * 100).toFixed(0)}% (0 = long detail, 100 = short & punchy)
- Formality: ${((behaviorProfile.formality_preference || 0.5) * 100).toFixed(0)}% (0 = casual, 100 = formal)
- Directness: ${((behaviorProfile.directness_preference || 0.5) * 100).toFixed(0)}% (0 = indirect, 100 = direct)
- Conflict Sensitivity: ${((behaviorProfile.conflict_sensitivity || 0.5) * 100).toFixed(0)}% (higher = more sensitive)
`
  : ""}

${identityIntel?.inferred_communication_style
  ? `Communication Style: ${JSON.stringify(identityIntel.inferred_communication_style)}`
  : ""}

${playbook
  ? `
Playbook Guidelines:
DO: ${playbook.do_list?.join(", ") || ""}
DON'T: ${playbook.dont_list?.join(", ") || ""}
Tone: ${playbook.tone_guidelines || ""}
`
  : ""}

Rewrite the original message to:
1. Match this person's communication style and preferences
2. Achieve the intent: ${intent}
3. Respect their DOs and DON'Ts
4. Use appropriate tone, brevity, formality, and directness

Return JSON:
{
  "rewritten_message": "The rewritten message text",
  "rationale": "Brief explanation of changes made"
}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 500,
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as RewriteMessageResult;

    return {
      rewritten_message: parsed.rewritten_message || originalMessage,
      rationale: parsed.rationale || "Message rewritten to match communication style.",
    };
  } catch (err) {
    console.error("[InfluenceRewrite] LLM generation failed:", err);
    return {
      rewritten_message: originalMessage,
      rationale: "Failed to rewrite message. Using original.",
    };
  }
}

