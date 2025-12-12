// Email Promises Engine
// lib/email/promises.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

export interface PromiseCandidate {
  promise_text: string;
  promise_due_at?: Date | null;
  confidence: number; // 0..1
}

export interface OutgoingEmailMessage {
  subject: string;
  body: string;
  to: string[];
  cc?: string[];
  sentAt: Date;
}

/**
 * Detect promises in outgoing email
 */
export async function detectPromisesInOutgoingEmail(
  message: OutgoingEmailMessage
): Promise<PromiseCandidate[]> {
  const prompt = `Analyze this outgoing email and extract any promises or commitments made by the sender.

Email:
Subject: ${message.subject}
To: ${message.to.join(", ")}
${message.cc ? `CC: ${message.cc.join(", ")}` : ""}
Sent: ${message.sentAt.toISOString()}

Body (first 3000 chars):
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
    console.error("[EmailPromises] LLM detection failed:", err);
    return [];
  }
}

/**
 * Upsert promises for outgoing message
 */
export async function upsertPromisesForOutgoingMessage(params: {
  userId: string;
  threadId: string;
  messageId: string;
  promises: PromiseCandidate[];
}): Promise<void> {
  const { userId, threadId, messageId, promises } = params;

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
      thread_id: threadId,
      message_id: messageId,
      promise_text: promise.promise_text,
      promise_due_at: promise.promise_due_at?.toISOString() || null,
      confidence: promise.confidence,
      status: "open",
    });
  }
}

/**
 * Update promise statuses (kept/broken)
 */
export async function updatePromiseStatusesForUser(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const now = new Date();

  // Get all open promises
  const { data: openPromises } = await supabaseAdmin
    .from("email_promises")
    .select("*, email_threads(*), email_tasks(*)")
    .eq("user_id", dbUserId)
    .eq("status", "open");

  for (const promise of openPromises || []) {
    const dueAt = promise.promise_due_at ? new Date(promise.promise_due_at) : null;
    const thread = promise.email_threads;
    const tasks = promise.email_tasks || [];

    // Check if promise is overdue
    if (dueAt && dueAt < now) {
      // Check if there are completed tasks related to this promise
      const hasCompletedTask = tasks.some((t: any) => t.status === "done");

      // Check if thread has recent activity suggesting fulfillment
      const threadLastMessage = thread?.last_message_at
        ? new Date(thread.last_message_at)
        : null;
      const daysSinceDue = dueAt ? (now.getTime() - dueAt.getTime()) / (1000 * 60 * 60 * 24) : 0;

      if (hasCompletedTask || (threadLastMessage && threadLastMessage > dueAt)) {
        // Mark as kept
        await supabaseAdmin
          .from("email_promises")
          .update({ status: "kept", updated_at: now.toISOString() })
          .eq("id", promise.id);
      } else if (daysSinceDue > 1) {
        // Mark as broken if overdue by more than 1 day and no evidence of fulfillment
        await supabaseAdmin
          .from("email_promises")
          .update({ status: "broken", updated_at: now.toISOString() })
          .eq("id", promise.id);
      }
    }
  }
}

