// Communications Promises
// lib/comms/promises.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import type { PromiseCandidate } from "@/lib/email/promises";

/**
 * Detect promises in comms message (SMS or call)
 */
export async function detectPromisesInCommsMessage(message: {
  body: string;
  fromIdentity: string;
  toIdentity: string;
  occurredAt: Date;
  direction: "incoming" | "outgoing";
}): Promise<PromiseCandidate[]> {
  if (message.direction !== "outgoing") {
    return []; // Only detect promises in outgoing messages
  }

  const prompt = `Analyze this outgoing SMS or call transcript and extract any promises or commitments made by the sender.

From: ${message.fromIdentity}
To: ${message.toIdentity}
Occurred: ${message.occurredAt.toISOString()}

Content:
${message.body.substring(0, 3000)}

Look for phrases like:
- "I'll..."
- "I will..."
- "I'll have this to you by..."
- "I promise to..."
- "I commit to..."
- "You can expect..."
- "I'll send..."
- etc.

Return a JSON array of promises. Each promise should have:
{
  "promise_text": "the exact or paraphrased promise phrase",
  "promise_due_at": "ISO date string or null (extract from phrases like 'by Friday', 'within 2 days', 'tomorrow', etc.)",
  "confidence": 0.0-1.0
}

If no promises found, return empty array [].

Return ONLY valid JSON array, no markdown, no explanation.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 600,
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as PromiseCandidate[];

    // Validate and normalize
    return parsed
      .filter((p) => p.promise_text && p.confidence >= 0)
      .map((p) => ({
        ...p,
        promise_due_at: p.promise_due_at && typeof p.promise_due_at === "string" ? new Date(p.promise_due_at) : null,
        confidence: Math.max(0, Math.min(1, p.confidence || 0.5)),
      }));
  } catch (err) {
    console.error("[CommsPromises] LLM detection failed:", err);
    return [];
  }
}

/**
 * Upsert promises for comms message
 */
export async function upsertPromisesForCommsMessage(params: {
  userId: string;
  commMessageId: string;
  promises: PromiseCandidate[];
}): Promise<void> {
  const { userId, commMessageId, promises } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  for (const promise of promises) {
    await supabaseAdmin.from("email_promises").insert({
      user_id: dbUserId,
      comm_message_id: commMessageId,
      promise_text: promise.promise_text,
      promise_due_at: promise.promise_due_at?.toISOString() || null,
      confidence: promise.confidence,
      status: "open",
    });
  }

  // Update interaction event if promise was detected
  if (promises.length > 0) {
    try {
      await supabaseAdmin
        .from("contact_interaction_events")
        .update({ contains_promise: true })
        .eq("comm_message_id", commMessageId);
    } catch (err) {
      // Ignore if event doesn't exist yet
    }
  }
}

