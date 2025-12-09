/**
 * Push Notification Service v1
 * lib/notifications/push.ts
 * 
 * Handles web push subscriptions and sending notifications
 */

import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";

// ============================================
// CONFIGURATION
// ============================================

// Initialize web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@pulselifeos.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ============================================
// TYPES
// ============================================

export type NotificationType =
  | "autonomy_suggestion"
  | "third_brain_insight"
  | "delegation_draft"
  | "daily_briefing"
  | "emotional_checkin"
  | "general";

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type?: NotificationType;
  url?: string;
  tag?: string;
  icon?: string;
  actions?: Array<{ action: string; title: string }>;
  data?: Record<string, any>;
  requireInteraction?: boolean;
}

export interface NotificationPreferences {
  autonomySuggestions: boolean;
  thirdBrainInsights: boolean;
  delegationDrafts: boolean;
  dailyBriefing: boolean;
  emotionalCheckinReminder: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxPerHour: number;
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Save a push subscription
 */
export async function saveSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  deviceInfo?: { userAgent?: string; deviceName?: string }
): Promise<{ success: boolean; id?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: deviceInfo?.userAgent,
          device_name: deviceInfo?.deviceName,
          enabled: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[Push] Error saving subscription:", error);
      return { success: false };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error("[Push] Exception saving subscription:", error);
    return { success: false };
  }
}

/**
 * Remove a push subscription
 */
export async function removeSubscription(
  userId: string,
  endpoint: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  return !error;
}

/**
 * Get user's subscriptions
 */
export async function getUserSubscriptions(
  userId: string
): Promise<PushSubscription[]> {
  const { data } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true);

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    enabled: row.enabled,
  }));
}

// ============================================
// PREFERENCES
// ============================================

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) {
    // Return defaults
    return {
      autonomySuggestions: true,
      thirdBrainInsights: true,
      delegationDrafts: true,
      dailyBriefing: true,
      emotionalCheckinReminder: false,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      maxPerHour: 5,
    };
  }

  return {
    autonomySuggestions: data.autonomy_suggestions,
    thirdBrainInsights: data.third_brain_insights,
    delegationDrafts: data.delegation_drafts,
    dailyBriefing: data.daily_briefing,
    emotionalCheckinReminder: data.emotional_checkin_reminder,
    quietHoursEnabled: data.quiet_hours_enabled,
    quietHoursStart: data.quiet_hours_start,
    quietHoursEnd: data.quiet_hours_end,
    maxPerHour: data.max_per_hour,
  };
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<boolean> {
  const dbUpdates: Record<string, any> = {};

  if (updates.autonomySuggestions !== undefined)
    dbUpdates.autonomy_suggestions = updates.autonomySuggestions;
  if (updates.thirdBrainInsights !== undefined)
    dbUpdates.third_brain_insights = updates.thirdBrainInsights;
  if (updates.delegationDrafts !== undefined)
    dbUpdates.delegation_drafts = updates.delegationDrafts;
  if (updates.dailyBriefing !== undefined)
    dbUpdates.daily_briefing = updates.dailyBriefing;
  if (updates.emotionalCheckinReminder !== undefined)
    dbUpdates.emotional_checkin_reminder = updates.emotionalCheckinReminder;
  if (updates.quietHoursEnabled !== undefined)
    dbUpdates.quiet_hours_enabled = updates.quietHoursEnabled;
  if (updates.quietHoursStart !== undefined)
    dbUpdates.quiet_hours_start = updates.quietHoursStart;
  if (updates.quietHoursEnd !== undefined)
    dbUpdates.quiet_hours_end = updates.quietHoursEnd;
  if (updates.maxPerHour !== undefined)
    dbUpdates.max_per_hour = updates.maxPerHour;

  const { error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert(
      { user_id: userId, ...dbUpdates },
      { onConflict: "user_id" }
    );

  return !error;
}

// ============================================
// SENDING NOTIFICATIONS
// ============================================

/**
 * Send a push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  // Check if VAPID keys are configured
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured");
    return { sent: 0, failed: 0 };
  }

  // Check preferences
  const prefs = await getNotificationPreferences(userId);
  
  // Check notification type preference
  const typeAllowed = checkTypePreference(payload.type, prefs);
  if (!typeAllowed) {
    console.log(`[Push] Notification type ${payload.type} disabled for user`);
    return { sent: 0, failed: 0 };
  }

  // Check quiet hours
  if (prefs.quietHoursEnabled && isInQuietHours(prefs)) {
    console.log("[Push] In quiet hours, skipping notification");
    return { sent: 0, failed: 0 };
  }

  // Check rate limit
  const canSend = await checkRateLimit(userId, prefs.maxPerHour);
  if (!canSend) {
    console.log("[Push] Rate limit exceeded");
    return { sent: 0, failed: 0 };
  }

  // Get user's subscriptions
  const subscriptions = await getUserSubscriptions(userId);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    tag: payload.tag || `pulse-${payload.type || "general"}`,
    url: payload.url || "/life",
    type: payload.type || "general",
    actions: payload.actions || [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
    requireInteraction: payload.requireInteraction || false,
    data: payload.data || {},
    timestamp: Date.now(),
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        notificationPayload
      );
      sent++;

      // Update last_used_at
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (error: any) {
      failed++;
      console.error(`[Push] Failed to send to ${sub.endpoint}:`, error.message);

      // Remove invalid subscriptions (410 Gone or 404 Not Found)
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
        console.log(`[Push] Removed invalid subscription ${sub.id}`);
      }
    }
  }

  // Log the notification
  await logNotification(userId, payload, sent > 0 ? "sent" : "failed");

  return { sent, failed };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Notify about new autonomy suggestion
 */
export async function notifyAutonomySuggestion(
  userId: string,
  suggestion: { title: string; description?: string; id: string }
): Promise<void> {
  await sendPushNotification(userId, {
    title: "✨ Pulse Suggestion",
    body: suggestion.title,
    type: "autonomy_suggestion",
    url: `/autonomy?id=${suggestion.id}`,
    tag: `autonomy-${suggestion.id}`,
    actions: [
      { action: "view", title: "View" },
      { action: "complete", title: "Done" },
    ],
  });
}

/**
 * Notify about important third brain insight
 */
export async function notifyThirdBrainInsight(
  userId: string,
  insight: { title: string; kind: string; id: string }
): Promise<void> {
  const emoji = insight.kind === "risk" ? "⚠️" : insight.kind === "opportunity" ? "🎯" : "💡";
  
  await sendPushNotification(userId, {
    title: `${emoji} ${insight.kind.charAt(0).toUpperCase() + insight.kind.slice(1)}`,
    body: insight.title,
    type: "third_brain_insight",
    url: `/third-brain?id=${insight.id}`,
    tag: `insight-${insight.id}`,
    requireInteraction: insight.kind === "risk",
  });
}

/**
 * Notify about new delegation draft
 */
export async function notifyDelegationDraft(
  userId: string,
  draft: { type: string; target?: string; id: string }
): Promise<void> {
  const typeLabel = draft.type === "email" ? "📧 Email" : draft.type === "message" ? "💬 Message" : "📝 Note";
  
  await sendPushNotification(userId, {
    title: `${typeLabel} Draft Ready`,
    body: draft.target ? `Follow-up for ${draft.target}` : "New draft for your review",
    type: "delegation_draft",
    url: `/delegation?id=${draft.id}`,
    tag: `draft-${draft.id}`,
  });
}

/**
 * Send daily briefing notification
 */
export async function notifyDailyBriefing(
  userId: string,
  briefing: { planCount: number; suggestionCount: number }
): Promise<void> {
  const body = briefing.planCount > 0
    ? `You have ${briefing.planCount} items planned today`
    : "Ready to plan your day?";

  await sendPushNotification(userId, {
    title: "☀️ Good Morning!",
    body,
    type: "daily_briefing",
    url: "/life",
    tag: "daily-briefing",
  });
}

// ============================================
// HELPERS
// ============================================

function checkTypePreference(
  type: NotificationType | undefined,
  prefs: NotificationPreferences
): boolean {
  switch (type) {
    case "autonomy_suggestion":
      return prefs.autonomySuggestions;
    case "third_brain_insight":
      return prefs.thirdBrainInsights;
    case "delegation_draft":
      return prefs.delegationDrafts;
    case "daily_briefing":
      return prefs.dailyBriefing;
    case "emotional_checkin":
      return prefs.emotionalCheckinReminder;
    default:
      return true;
  }
}

function isInQuietHours(prefs: NotificationPreferences): boolean {
  const now = new Date();
  const currentTime = `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}`;

  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }
  return currentTime >= start && currentTime < end;
}

async function checkRateLimit(userId: string, maxPerHour: number): Promise<boolean> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const { count } = await supabaseAdmin
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo.toISOString());

  return (count || 0) < maxPerHour;
}

async function logNotification(
  userId: string,
  payload: NotificationPayload,
  status: "sent" | "failed"
): Promise<void> {
  await supabaseAdmin.from("notification_log").insert({
    user_id: userId,
    type: payload.type || "general",
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    status,
  });
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}