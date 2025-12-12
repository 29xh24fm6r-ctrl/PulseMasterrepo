// Email Attention Score Engine
// lib/email/attention.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface AttentionBreakdown {
  urgentFollowups: number;
  overduePromises: number;
  overdueTasks: number;
  unreadPriorityEmails: number;
}

export interface AttentionScoreResult {
  score: number; // 0..100
  breakdown: AttentionBreakdown;
}

/**
 * Calculate email attention score
 */
export async function calculateEmailAttentionScore(
  userId: string
): Promise<AttentionScoreResult> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const now = new Date();

  // 1. Urgent followups (due or overdue)
  const { data: urgentFollowups } = await supabaseAdmin
    .from("email_followups")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("status", "open")
    .lte("response_due_at", now.toISOString());

  // 2. Overdue promises
  const { data: overduePromises } = await supabaseAdmin
    .from("email_promises")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("status", "open")
    .lt("promise_due_at", now.toISOString());

  // 3. Overdue tasks
  const { data: overdueTasks } = await supabaseAdmin
    .from("email_tasks")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("status", "open")
    .not("due_at", "is", null)
    .lt("due_at", now.toISOString());

  // 4. Unread priority emails
  const { data: unreadPriorityEmails } = await supabaseAdmin
    .from("email_threads")
    .select("id")
    .eq("user_id", dbUserId)
    .in("importance", ["high", "critical"])
    .eq("unread", true);

  const breakdown: AttentionBreakdown = {
    urgentFollowups: (urgentFollowups || []).length,
    overduePromises: (overduePromises || []).length,
    overdueTasks: (overdueTasks || []).length,
    unreadPriorityEmails: (unreadPriorityEmails || []).length,
  };

  // Calculate score (weighted sum, capped at 100)
  const score = Math.min(
    100,
    breakdown.urgentFollowups * 15 +
      breakdown.overduePromises * 20 +
      breakdown.overdueTasks * 10 +
      breakdown.unreadPriorityEmails * 5
  );

  return {
    score,
    breakdown,
  };
}

/**
 * Get risk level from score
 */
export function getRiskLevel(score: number): "Low" | "Moderate" | "High" {
  if (score >= 60) return "High";
  if (score >= 30) return "Moderate";
  return "Low";
}

/**
 * Unified attention score including comms (SMS + calls)
 */
export interface UnifiedAttentionScoreResult extends AttentionScoreResult {
  comms: {
    smsResponsibilitiesOpen: number;
    smsPromisesOpen: number;
    callResponsibilitiesOpen: number;
    callPromisesOpen: number;
    audioResponsibilitiesOpen: number;
    audioPromisesOpen: number;
  };
}

export async function calculateUnifiedAttentionScore(
  userId: string
): Promise<UnifiedAttentionScoreResult> {
  const emailBase = await calculateEmailAttentionScore(userId);

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const now = new Date();

  // 1. Count open responsibilities from SMS
  const { data: smsResponsibilities } = await supabaseAdmin
    .from("email_responsibilities")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("status", "open")
    .not("comm_message_id", "is", null)
    .in("comm_message_id", [
      supabaseAdmin
        .from("comm_messages")
        .select("id")
        .eq("source_type", "sms")
        .then((r) => (r.data || []).map((m: any) => m.id)),
    ]);

  // Get SMS message IDs first
  const { data: smsMessages } = await supabaseAdmin
    .from("comm_messages")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("source_type", "sms");

  const smsMessageIds = (smsMessages || []).map((m) => m.id);

  let smsResponsibilitiesOpen = 0;
  let smsPromisesOpen = 0;
  if (smsMessageIds.length > 0) {
    const { data: smsResps } = await supabaseAdmin
      .from("email_responsibilities")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .in("comm_message_id", smsMessageIds);

    smsResponsibilitiesOpen = (smsResps || []).length;

    const { data: smsProms } = await supabaseAdmin
      .from("email_promises")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .in("comm_message_id", smsMessageIds);

    smsPromisesOpen = (smsProms || []).length;
  }

  // Count open responsibilities from calls
  const { data: callMessages } = await supabaseAdmin
    .from("comm_messages")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("source_type", "call");

  const callMessageIds = (callMessages || []).map((m) => m.id);

  let callResponsibilitiesOpen = 0;
  let callPromisesOpen = 0;
  if (callMessageIds.length > 0) {
    const { data: callResps } = await supabaseAdmin
      .from("email_responsibilities")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .in("comm_message_id", callMessageIds);

    callResponsibilitiesOpen = (callResps || []).length;

    const { data: callProms } = await supabaseAdmin
      .from("email_promises")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .in("comm_message_id", callMessageIds);

    callPromisesOpen = (callProms || []).length;
  }

  // 3. Count open responsibilities and promises from audio
  const { data: audioMessages } = await supabaseAdmin
    .from("comm_messages")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("source_type", "audio");

  const audioMessageIds = (audioMessages || []).map((m) => m.id);

  let audioResponsibilitiesOpen = 0;
  let audioPromisesOpen = 0;
  if (audioMessageIds.length > 0) {
    const { data: audioResps } = await supabaseAdmin
      .from("email_responsibilities")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .in("comm_message_id", audioMessageIds);

    audioResponsibilitiesOpen = (audioResps || []).length;

    const { data: audioProms } = await supabaseAdmin
      .from("email_promises")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .in("comm_message_id", audioMessageIds);

    audioPromisesOpen = (audioProms || []).length;
  }

  // 4. Combine scores (add comms + audio penalties)
  const commsPenalty =
    smsResponsibilitiesOpen * 5 +
    smsPromisesOpen * 10 +
    callResponsibilitiesOpen * 8 +
    callPromisesOpen * 12 +
    audioResponsibilitiesOpen * 6 +
    audioPromisesOpen * 10;

  const unifiedScore = Math.min(100, emailBase.score + commsPenalty);

  return {
    score: unifiedScore,
    breakdown: emailBase.breakdown,
    comms: {
      smsResponsibilitiesOpen,
      smsPromisesOpen,
      callResponsibilitiesOpen,
      callPromisesOpen,
      audioResponsibilitiesOpen,
      audioPromisesOpen,
    },
  };
}

