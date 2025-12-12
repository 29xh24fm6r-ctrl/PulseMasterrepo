// Email Processor - Integrates analyzer with sync
// lib/email/processor.ts

import { supabaseAdmin } from "@/lib/supabase";
import { analyzeEmailContent } from "./analyzer";
import { updateFollowupsForThread } from "./followups";
import { handleAGIEvent } from "@/lib/agi/orchestrator";
import { emailIngestedTrigger } from "@/lib/agi/triggers";

/**
 * Process a newly synced email message
 * Call this after syncing emails to analyze and create tasks/followups
 */
export async function processEmailMessage(
  userId: string,
  messageId: string
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get message
  const { data: message } = await supabaseAdmin
    .from("email_messages")
    .select("*, email_threads(*)")
    .eq("id", messageId)
    .eq("user_id", dbUserId)
    .single();

  if (!message) {
    console.warn("[EmailProcessor] Message not found:", messageId);
    return;
  }

  // Analyze email
  const analysis = await analyzeEmailContent({
    subject: message.subject || "",
    body: message.body || message.snippet || "",
    from: message.from_address || "",
    to: message.to_addresses || [],
    sentAt: new Date(message.sent_at),
    isIncoming: message.is_incoming,
  });

  // Update thread importance
  if (analysis.priority && message.thread_id) {
    await supabaseAdmin
      .from("email_threads")
      .update({ importance: analysis.priority })
      .eq("id", message.thread_id);
  }

  // Trigger AGI Kernel for email intelligence
  try {
    await handleAGIEvent(userId, emailIngestedTrigger({
      threadId: message.thread_id,
      from: message.from_address,
      to: message.to_addresses?.[0],
      subject: message.subject,
      hasDeadlines: analysis.tasks && analysis.tasks.length > 0,
      isFromHighPriorityContact: analysis.priority === "high",
    }));
  } catch (agiErr) {
    // Don't fail email processing if AGI fails
    console.warn("[EmailProcessor] AGI trigger failed:", agiErr);
  }

  // Create tasks if any
  if (analysis.tasks && analysis.tasks.length > 0) {
    for (const task of analysis.tasks) {
      await supabaseAdmin.from("email_tasks").insert({
        user_id: dbUserId,
        thread_id: message.thread_id,
        message_id: message.id,
        title: task.title,
        description: task.description || null,
        due_at: task.dueAt?.toISOString() || null,
        priority: task.priority || "normal",
        status: "open",
      });
    }
  }

  // Update followups
  if (message.thread_id) {
    await updateFollowupsForThread(message.thread_id, userId);
  }
}

/**
 * Process all unprocessed messages for a user
 */
export async function processUnprocessedMessages(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get messages from last 7 days that haven't been processed
  // (We'll use a simple heuristic: messages without tasks or followups)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: messages } = await supabaseAdmin
    .from("email_messages")
    .select("id")
    .eq("user_id", dbUserId)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  for (const message of messages || []) {
    try {
      await processEmailMessage(userId, message.id);
    } catch (err) {
      console.error(`[EmailProcessor] Failed to process message ${message.id}:`, err);
    }
  }
}

