/**
 * Advanced Push Notifications v2
 * lib/notifications/advanced.ts
 * 
 * Smart notification batching, priority routing, and digests
 */

import { supabaseAdmin } from "@/lib/supabase";
import { sendPushNotification, getNotificationPreferences } from "./push";

// ============================================
// TYPES
// ============================================

export interface SmartNotification {
  userId: string;
  type: NotificationType;
  priority: "low" | "normal" | "high" | "urgent";
  title: string;
  body: string;
  data?: Record<string, any>;
  url?: string;
  groupKey?: string;
  expiresAt?: Date;
}

export type NotificationType =
  | "autonomy_suggestion"
  | "third_brain_insight"
  | "delegation_draft"
  | "daily_briefing"
  | "weekly_review"
  | "relationship_reminder"
  | "campaign_step"
  | "calendar_reminder"
  | "email_important"
  | "goal_progress"
  | "streak_alert";

export interface NotificationDigest {
  userId: string;
  type: "morning" | "evening" | "weekly";
  items: DigestItem[];
  generatedAt: Date;
}

export interface DigestItem {
  category: string;
  title: string;
  count?: number;
  priority: string;
}

// ============================================
// PRIORITY ROUTING
// ============================================

const PRIORITY_CONFIG = {
  urgent: { immediate: true, sound: true, vibrate: [200, 100, 200], batchable: false },
  high: { immediate: true, sound: true, vibrate: [200], batchable: false },
  normal: { immediate: false, sound: false, vibrate: [], batchable: false },
  low: { immediate: false, sound: false, vibrate: [], batchable: true },
};

const TYPE_PRIORITY: Record<NotificationType, SmartNotification["priority"]> = {
  autonomy_suggestion: "normal",
  third_brain_insight: "high",
  delegation_draft: "normal",
  daily_briefing: "normal",
  weekly_review: "low",
  relationship_reminder: "normal",
  campaign_step: "low",
  calendar_reminder: "high",
  email_important: "high",
  goal_progress: "low",
  streak_alert: "normal",
};

// ============================================
// SMART NOTIFICATION QUEUE
// ============================================

/**
 * Queue a smart notification with priority routing
 */
export async function queueNotification(notification: SmartNotification): Promise<boolean> {
  const priority = notification.priority || TYPE_PRIORITY[notification.type] || "normal";
  const config = PRIORITY_CONFIG[priority];

  // Urgent/High - send immediately
  if (config.immediate) {
    return await sendImmediately(notification, config);
  }

  // Batchable - queue for digest
  if (config.batchable) {
    return await addToDigestQueue(notification);
  }

  // Normal - check batching window
  const recentCount = await getRecentNotificationCount(notification.userId, 5);
  if (recentCount >= 3) {
    return await addToDigestQueue(notification);
  }

  return await sendImmediately(notification, config);
}

/**
 * Send notification immediately
 */
async function sendImmediately(
  notification: SmartNotification,
  config: typeof PRIORITY_CONFIG.urgent
): Promise<boolean> {
  const result = await sendPushNotification(notification.userId, {
    title: notification.title,
    body: notification.body,
    type: notification.type as any,
    url: notification.url,
    data: notification.data,
    tag: notification.groupKey,
  });

  return result.sent > 0;
}

/**
 * Add to digest queue
 */
async function addToDigestQueue(notification: SmartNotification): Promise<boolean> {
  const { error } = await supabaseAdmin.from("notification_queue").insert({
    user_id: notification.userId,
    type: notification.type as any,
    priority: notification.priority,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    url: notification.url,
    group_key: notification.groupKey,
    expires_at: notification.expiresAt?.toISOString(),
    status: "queued",
    created_at: new Date().toISOString(),
  });

  return !error;
}

/**
 * Get recent notification count for rate limiting
 */
async function getRecentNotificationCount(userId: string, minutes: number): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const { count } = await supabaseAdmin
    .from("notification_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  return count || 0;
}

// ============================================
// DIGEST GENERATION
// ============================================

/**
 * Generate morning digest for a user
 */
export async function generateMorningDigest(userId: string): Promise<NotificationDigest | null> {
  const items: DigestItem[] = [];

  // Get pending autonomy suggestions
  const { count: autonomyCount } = await supabaseAdmin
    .from("autonomy_actions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (autonomyCount && autonomyCount > 0) {
    items.push({
      category: "Suggestions",
      title: `${autonomyCount} action${autonomyCount > 1 ? "s" : ""} suggested`,
      count: autonomyCount,
      priority: "normal",
    });
  }

  // Get today's calendar events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { count: eventCount } = await supabaseAdmin
    .from("calendar_events_cache")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("start_time", today.toISOString())
    .lt("start_time", tomorrow.toISOString());

  if (eventCount && eventCount > 0) {
    items.push({
      category: "Calendar",
      title: `${eventCount} event${eventCount > 1 ? "s" : ""} today`,
      count: eventCount,
      priority: "high",
    });
  }

  // Get relationships needing attention
  const { count: relCount } = await supabaseAdmin
    .from("relationships")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .lt("health_score", 50);

  if (relCount && relCount > 0) {
    items.push({
      category: "Relationships",
      title: `${relCount} relationship${relCount > 1 ? "s" : ""} need attention`,
      count: relCount,
      priority: "normal",
    });
  }

  // Get pending drafts
  const { count: draftCount } = await supabaseAdmin
    .from("delegation_drafts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (draftCount && draftCount > 0) {
    items.push({
      category: "Drafts",
      title: `${draftCount} draft${draftCount > 1 ? "s" : ""} ready to send`,
      count: draftCount,
      priority: "normal",
    });
  }

  if (items.length === 0) return null;

  return {
    userId,
    type: "morning",
    items,
    generatedAt: new Date(),
  };
}

/**
 * Send morning digest notification
 */
export async function sendMorningDigest(userId: string): Promise<boolean> {
  const digest = await generateMorningDigest(userId);
  if (!digest || digest.items.length === 0) return false;

  const totalItems = digest.items.reduce((sum, item) => sum + (item.count || 1), 0);
  const topItem = digest.items[0];

  await sendPushNotification(userId, {
    title: "☀️ Good Morning!",
    body: `You have ${totalItems} items: ${topItem.title}${digest.items.length > 1 ? ` and ${digest.items.length - 1} more` : ""}`,
    type: "daily_briefing",
    url: "/life",
    data: { digest: true, itemCount: totalItems },
  });

  return true;
}

/**
 * Generate evening digest
 */
export async function generateEveningDigest(userId: string): Promise<NotificationDigest | null> {
  const items: DigestItem[] = [];

  // Get completed tasks today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: completedCount } = await supabaseAdmin
    .from("autonomy_actions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("updated_at", today.toISOString());

  if (completedCount && completedCount > 0) {
    items.push({
      category: "Completed",
      title: `${completedCount} task${completedCount > 1 ? "s" : ""} done today`,
      count: completedCount,
      priority: "low",
    });
  }

  // Get tomorrow's events
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const { count: tomorrowCount } = await supabaseAdmin
    .from("calendar_events_cache")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("start_time", tomorrow.toISOString())
    .lt("start_time", dayAfter.toISOString());

  if (tomorrowCount && tomorrowCount > 0) {
    items.push({
      category: "Tomorrow",
      title: `${tomorrowCount} event${tomorrowCount > 1 ? "s" : ""} scheduled`,
      count: tomorrowCount,
      priority: "normal",
    });
  }

  if (items.length === 0) return null;

  return {
    userId,
    type: "evening",
    items,
    generatedAt: new Date(),
  };
}

/**
 * Send evening digest notification
 */
export async function sendEveningDigest(userId: string): Promise<boolean> {
  const digest = await generateEveningDigest(userId);
  if (!digest || digest.items.length === 0) return false;

  const completedItem = digest.items.find((i) => i.category === "Completed");
  const tomorrowItem = digest.items.find((i) => i.category === "Tomorrow");

  let body = "";
  if (completedItem) body += `✓ ${completedItem.title}. `;
  if (tomorrowItem) body += `Tomorrow: ${tomorrowItem.title}`;

  await sendPushNotification(userId, {
    title: "🌙 Evening Wrap-up",
    body: body.trim(),
    type: "daily_briefing",
    url: "/life",
  });

  return true;
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Process queued notifications (run via cron)
 */
export async function processNotificationQueue(): Promise<{ sent: number; batched: number }> {
  const { data: queued } = await supabaseAdmin
    .from("notification_queue")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(100);

  if (!queued || queued.length === 0) return { sent: 0, batched: 0 };

  // Group by user
  const byUser = new Map<string, typeof queued>();
  for (const item of queued) {
    const existing = byUser.get(item.user_id) || [];
    existing.push(item);
    byUser.set(item.user_id, existing);
  }

  let sent = 0;
  let batched = 0;

  for (const [userId, items] of byUser) {
    if (items.length === 1) {
      // Single notification - send directly
      const item = items[0];
      await sendPushNotification(userId, {
        title: item.title,
        body: item.body,
        type: item.type,
        url: item.url,
      });
      sent++;
    } else {
      // Multiple - send batched summary
      await sendPushNotification(userId, {
        title: `📬 ${items.length} Updates`,
        body: items.slice(0, 3).map((i) => i.title).join(", ") + (items.length > 3 ? "..." : ""),
        type: "daily_briefing",
        url: "/life",
      });
      batched += items.length;
    }

    // Mark as sent
    const ids = items.map((i) => i.id);
    await supabaseAdmin
      .from("notification_queue")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .in("id", ids);
  }

  return { sent, batched };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export async function notifyImportantEmail(
  userId: string,
  email: { from: string; subject: string; threadId: string }
): Promise<boolean> {
  return queueNotification({
    userId,
    type: "email_important",
    priority: "high",
    title: `📧 ${email.from}`,
    body: email.subject,
    url: `/email?thread=${email.threadId}`,
    groupKey: "email",
  });
}

export async function notifyRelationshipReminder(
  userId: string,
  relationship: { name: string; id: string; reason: string }
): Promise<boolean> {
  return queueNotification({
    userId,
    type: "relationship_reminder",
    priority: "normal",
    title: `👋 Reconnect with ${relationship.name}`,
    body: relationship.reason,
    url: `/relationships/${relationship.id}`,
    groupKey: "relationships",
  });
}

export async function notifyGoalProgress(
  userId: string,
  goal: { title: string; progress: number }
): Promise<boolean> {
  return queueNotification({
    userId,
    type: "goal_progress",
    priority: "low",
    title: `🎯 ${goal.title}`,
    body: `${goal.progress}% complete`,
    url: "/weekly-plan",
    groupKey: "goals",
  });
}

export async function notifyStreakAlert(
  userId: string,
  streak: { type: string; days: number; atRisk: boolean }
): Promise<boolean> {
  return queueNotification({
    userId,
    type: "streak_alert",
    priority: streak.atRisk ? "high" : "low",
    title: streak.atRisk ? `🔥 ${streak.days}-day streak at risk!` : `🔥 ${streak.days}-day streak!`,
    body: streak.atRisk ? `Don't break your ${streak.type} streak` : `Keep up your ${streak.type} habit`,
    url: "/life",
    groupKey: "streaks",
  });
}