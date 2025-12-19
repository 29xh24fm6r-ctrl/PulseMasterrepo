import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PulseEvent = {
  user_id?: string | null;
  session_id?: string | null;
  request_id?: string | null;

  event_name: string;
  feature_id?: string | null;

  path?: string | null;
  method?: string | null;
  status?: number | null;
  latency_ms?: number | null;

  referrer?: string | null;
  user_agent?: string | null;

  properties?: Record<string, any>;
};

export async function trackEvent(evt: PulseEvent) {
  try {
    // Check required env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("[ANALYTICS] Missing env vars, skipping event tracking");
      return;
    }

    const { error } = await supabaseAdmin.from("pulse_events").insert({
      user_id: evt.user_id ?? null,
      session_id: evt.session_id ?? null,
      request_id: evt.request_id ?? null,
      event_name: evt.event_name,
      feature_id: evt.feature_id ?? null,
      path: evt.path ?? null,
      method: evt.method ?? null,
      status: evt.status ?? null,
      latency_ms: evt.latency_ms ?? null,
      referrer: evt.referrer ?? null,
      user_agent: evt.user_agent ?? null,
      properties: evt.properties ?? {},
    });

    if (error) {
      console.warn("[ANALYTICS] Failed to insert event:", error.message);
    }
  } catch (err: any) {
    // Analytics must never break product flow.
    console.warn("[ANALYTICS] Event tracking error:", err?.message || String(err));
  }
}

