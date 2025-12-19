// lib/automation/audit.ts
// Sprint 4: Audit logging for automation actions
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "automation_audit" });

/**
 * Log an automation action to audit_log
 */
export async function logAutomationAction(params: {
  user_id: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  action: string;
  payload?: Record<string, any>;
  source: "automation" | "agent" | "job";
  source_id?: string;
  correlation_id?: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert({
      user_id: params.user_id,
      action_type: params.action_type,
      entity_type: params.entity_type || null,
      entity_id: params.entity_id || null,
      action: params.action,
      payload: params.payload || {},
      source: params.source,
      source_id: params.source_id || null,
      correlation_id: params.correlation_id || null,
    });
  } catch (err: any) {
    logger.error("Failed to write audit log", err, params);
    // Don't throw - audit logging failures shouldn't break operations
  }
}

