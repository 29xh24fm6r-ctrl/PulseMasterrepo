// Safety Incident Logger
// lib/safety/logger.ts

import { supabaseAdmin } from "@/lib/supabase";
import { SafetyCategory, SafetyAction } from "./types";

export interface LogSafetyIncidentParams {
  userId?: string;
  coachId: string;
  personaId?: string;
  policyKey: string;
  category: SafetyCategory;
  action: SafetyAction;
  severity: number;
  userInput: string;
  modelOutput: string;
  incidentType?: "blocked_output" | "sanitized_output" | "escalation";
  metadata?: Record<string, any>;
}

/**
 * Log safety incident
 */
export async function logSafetyIncident(
  params: LogSafetyIncidentParams
): Promise<void> {
  // Get user's database ID if provided
  let dbUserId = params.userId;
  if (params.userId) {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", params.userId)
      .maybeSingle();

    dbUserId = userRow?.id || params.userId;
  }

  // Truncate excerpts for storage
  const userInputExcerpt = params.userInput.substring(0, 500);
  const modelOutputExcerpt = params.modelOutput.substring(0, 500);

  await supabaseAdmin.from("safety_incidents").insert({
    user_id: dbUserId || null,
    coach_id: params.coachId,
    persona_id: params.personaId || null,
    policy_key: params.policyKey,
    incident_type: params.incidentType || "blocked_output",
    category: params.category,
    severity: params.severity,
    user_input_excerpt: userInputExcerpt,
    model_output_excerpt: modelOutputExcerpt,
    metadata: params.metadata || {},
  });
}




