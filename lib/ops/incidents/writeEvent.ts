// src/lib/ops/incidents/writeEvent.ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type OpsEventLevel = "info" | "warn" | "error" | "success";

export type OpsEventInput = {
  incident_id?: string | null;
  source: "github" | "smoke" | "rollback" | "app";
  event_type: string;
  level?: OpsEventLevel;
  summary: string;
  link?: string | null;
  payload?: Record<string, unknown>;
};

export async function writeOpsEvent(evt: OpsEventInput) {
  const sb = supabaseAdmin();

  const { error } = await sb.from("ops_incident_events").insert({
    incident_id: evt.incident_id ?? null,
    source: evt.source,
    event_type: evt.event_type,
    level: evt.level ?? "info",
    summary: evt.summary,
    link: evt.link ?? null,
    payload: evt.payload ?? {},
  });

  if (error) {
    throw new Error(`ops_event_insert_failed: ${error.message}`);
  }
}

