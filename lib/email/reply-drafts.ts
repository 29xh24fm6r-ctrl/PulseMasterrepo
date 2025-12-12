// Email Reply Drafts Engine
// lib/email/reply-drafts.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

export interface ReplyDraft {
  style: "short_ack" | "full_reply" | "clarification";
  label: string;
  body: string;
}

/**
 * Generate reply drafts for a thread
 */
export async function generateReplyDrafts(params: {
  userId: string;
  threadId: string;
  messageId: string;
}): Promise<ReplyDraft[]> {
  const { userId, threadId, messageId } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load thread context (recent messages)
  const { data: messages } = await supabaseAdmin
    .from("email_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: false })
    .limit(10);

  if (!messages || messages.length === 0) {
    return [];
  }

  const latestMessage = messages[0];

  // 2. Load responsibilities & promises for this thread
  const { data: responsibilities } = await supabaseAdmin
    .from("email_responsibilities")
    .select("*")
    .eq("thread_id", threadId)
    .eq("status", "open");

  const { data: promises } = await supabaseAdmin
    .from("email_promises")
    .select("*")
    .eq("thread_id", threadId)
    .eq("status", "open");

  // Build conversation summary
  const conversationSummary = messages
    .reverse()
    .map(
      (m) =>
        `${m.is_incoming ? "From" : "To"}: ${m.from_address || "Unknown"}\n${m.body || m.snippet || ""}`
    )
    .join("\n\n---\n\n");

  const responsibilitiesText =
    responsibilities && responsibilities.length > 0
      ? responsibilities.map((r) => `- ${r.required_action} (${r.responsibility_type})`).join("\n")
      : "None";

  const promisesText =
    promises && promises.length > 0
      ? promises.map((p) => `- ${p.promise_text}`).join("\n")
      : "None";

  // 3. Build LLM prompt
  const prompt = `You are helping draft email replies. Generate 2-3 reply options for this email thread.

Thread Subject: ${latestMessage.subject || "No subject"}

Conversation Summary:
${conversationSummary.substring(0, 3000)}

Open Responsibilities:
${responsibilitiesText}

Open Promises:
${promisesText}

Generate 2-3 reply drafts with different styles:

1. **Short acknowledgment** (if a quick "got it" or "thanks" is appropriate)
2. **Full contextual reply** (addresses the email comprehensively)
3. **Clarification question** (if more info is needed)

Return JSON array:
[
  {
    "style": "short_ack" | "full_reply" | "clarification",
    "label": "Short description (e.g., 'Quick acknowledgment', 'Comprehensive reply', 'Clarification needed')",
    "body": "The actual reply text"
  }
]

Be professional, concise, and contextually appropriate. Return ONLY valid JSON array, no markdown, no explanation.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1000,
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as ReplyDraft[];

    // Validate
    return parsed.filter(
      (d) =>
        d.style &&
        d.label &&
        d.body &&
        ["short_ack", "full_reply", "clarification"].includes(d.style)
    );
  } catch (err) {
    console.error("[EmailReplyDrafts] LLM generation failed:", err);
    return [];
  }
}

