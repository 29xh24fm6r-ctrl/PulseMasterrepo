// Email Followups Engine
// lib/email/followups.ts

import { supabaseAdmin } from "@/lib/supabase";
import { analyzeEmailContent } from "./analyzer";

/**
 * Update followups for a thread
 */
export async function updateFollowupsForThread(
  threadId: string,
  userId: string
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Get latest message in thread
  const { data: latestMessage } = await supabaseAdmin
    .from("email_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestMessage) {
    return;
  }

  // 2. Check if latest is incoming and requires reply
  if (latestMessage.is_incoming) {
    // Analyze the message
    const analysis = await analyzeEmailContent({
      subject: latestMessage.subject || "",
      body: latestMessage.body || latestMessage.snippet || "",
      from: latestMessage.from_address || "",
      to: latestMessage.to_addresses || [],
      sentAt: new Date(latestMessage.sent_at),
      isIncoming: true,
    });

    if (analysis.requiresReply) {
      // Open or refresh followup
      const responseDueAt = analysis.replyDueAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

      await supabaseAdmin
        .from("email_followups")
        .upsert(
          {
            user_id: dbUserId,
            thread_id: threadId,
            last_message_id: latestMessage.id,
            last_from_you: false,
            response_due_at: responseDueAt.toISOString(),
            status: "open",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "thread_id",
          }
        );
    }
  } else {
    // 3. If latest is your outgoing reply -> mark any open followup as "replied"
    await supabaseAdmin
      .from("email_followups")
      .update({
        status: "replied",
        updated_at: new Date().toISOString(),
      })
      .eq("thread_id", threadId)
      .eq("status", "open");
  }
}

/**
 * Get open followups for user
 */
export async function getOpenFollowupsForUser(
  userId: string,
  options?: { before?: Date }
): Promise<any[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  let query = supabaseAdmin
    .from("email_followups")
    .select("*, email_threads(*), email_messages(*)")
    .eq("user_id", dbUserId)
    .eq("status", "open")
    .order("response_due_at", { ascending: true });

  if (options?.before) {
    query = query.lte("response_due_at", options.before.toISOString());
  }

  const { data: followups } = await query;

  return (followups || []).map((f: any) => {
    const thread = f.email_threads || {};
    return {
      id: f.id,
      threadId: f.thread_id,
      thread: {
        ...thread,
        last_from: thread.last_from || thread.last_message_from,
        last_to: thread.last_to || (thread.last_message_to ? [thread.last_message_to] : []),
      },
      lastMessage: f.email_messages,
      responseDueAt: f.response_due_at,
      lastFromYou: f.last_from_you,
    };
  });
}

/**
 * Detect broken promises (commitments made in outgoing emails)
 */
export async function detectBrokenPromises(userId: string): Promise<any[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get outgoing messages from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: outgoingMessages } = await supabaseAdmin
    .from("email_messages")
    .select("*, email_threads(*)")
    .eq("user_id", dbUserId)
    .eq("is_incoming", false)
    .gte("sent_at", sevenDaysAgo.toISOString())
    .order("sent_at", { ascending: false });

  const promises: any[] = [];

  // Simple heuristic: look for "I'll", "by", "deadline", etc.
  for (const message of outgoingMessages || []) {
    const body = (message.body || message.snippet || "").toLowerCase();
    const hasCommitment =
      body.includes("i'll") ||
      body.includes("i will") ||
      body.includes("by ") ||
      body.includes("deadline") ||
      body.includes("promise");

    if (hasCommitment) {
      // Check if there's a followup that's overdue
      const { data: followup } = await supabaseAdmin
        .from("email_followups")
        .select("*")
        .eq("thread_id", message.thread_id)
        .eq("status", "open")
        .maybeSingle();

      if (followup && new Date(followup.response_due_at) < new Date()) {
        promises.push({
          messageId: message.id,
          threadId: message.thread_id,
          thread: message.email_threads,
          sentAt: message.sent_at,
          snippet: message.snippet,
        });
      }
    }
  }

  return promises;
}

