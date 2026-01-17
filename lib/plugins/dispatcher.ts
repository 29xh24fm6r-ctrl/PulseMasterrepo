// Plugin Event Dispatcher
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import crypto from "crypto";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

type EventType = 
  | "tb.fragment_created"
  | "tb.insight_created"
  | "ef.eo_created"
  | "mc.profile_updated"
  | "emo.state_detected"
  | "task.completed"
  | "identity.momentum_updated";

interface EventPayload {
  event_type: EventType;
  user_id: string;
  data: Record<string, any>;
  timestamp: string;
}

export async function dispatchEvent(
  eventType: EventType,
  userId: string,
  data: Record<string, any>
): Promise<{ dispatched: number; errors: number }> {
  const supabase = getSupabase();

  // Find subscribed apps
  const { data: subscriptions } = await supabase
    .from("dev_event_subscriptions")
    .select("*, dev_apps!inner(app_id, webhook_url, status)")
    .eq("event_type", eventType)
    .eq("is_active", true)
    .eq("dev_apps.user_id", userId)
    .eq("dev_apps.status", "active");

  if (!subscriptions || subscriptions.length === 0) {
    return { dispatched: 0, errors: 0 };
  }

  const payload: EventPayload = {
    event_type: eventType,
    user_id: userId,
    data,
    timestamp: new Date().toISOString(),
  };

  let dispatched = 0;
  let errors = 0;

  for (const sub of subscriptions) {
    const webhookUrl = sub.dev_apps.webhook_url;
    if (!webhookUrl) continue;

    try {
      // Create signature for webhook verification
      const signature = crypto
        .createHmac("sha256", sub.secret_hash || "")
        .update(JSON.stringify(payload))
        .digest("hex");

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pulse-Signature": signature,
          "X-Pulse-Event": eventType,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        dispatched++;
        // Update last triggered
        await supabase
          .from("dev_event_subscriptions")
          .update({ last_triggered_at: new Date().toISOString() })
          .eq("id", sub.id);
      } else {
        errors++;
        console.error(`Webhook failed for ${sub.dev_apps.app_id}: ${response.status}`);
      }
    } catch (error) {
      errors++;
      console.error(`Webhook error for ${sub.dev_apps.app_id}:`, error);
    }
  }

  return { dispatched, errors };
}

// Helper functions to trigger events from other modules
export async function onFragmentCreated(userId: string, fragmentId: string, content: string) {
  return dispatchEvent("tb.fragment_created", userId, { fragment_id: fragmentId, content_preview: content.substring(0, 100) });
}

export async function onEmotionDetected(userId: string, emotion: string, intensity: number) {
  return dispatchEvent("emo.state_detected", userId, { emotion, intensity });
}

export async function onTaskCompleted(userId: string, taskId: string, title: string) {
  return dispatchEvent("task.completed", userId, { task_id: taskId, title });
}

export default { dispatchEvent, onFragmentCreated, onEmotionDetected, onTaskCompleted };