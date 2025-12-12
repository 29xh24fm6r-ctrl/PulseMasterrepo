// Intervention Engine
// lib/interventions/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { Intervention, InterventionTriggerContext, ChosenIntervention } from "./types";

/**
 * Choose best intervention for a context
 */
export async function chooseIntervention(
  ctx: InterventionTriggerContext
): Promise<ChosenIntervention | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", ctx.userId)
    .single();

  const dbUserId = userRow?.id || ctx.userId;

  // Build query for matching triggers
  let query = supabaseAdmin
    .from("intervention_triggers")
    .select("*, interventions(*)")
    .eq("active", true);

  // Filter by risk type if provided
  if (ctx.riskType) {
    query = query.or(`risk_type.eq.${ctx.riskType},risk_type.is.null`);
  } else {
    query = query.is("risk_type", null);
  }

  // Filter by emotion if provided
  if (ctx.emotion) {
    query = query.or(`emotion.eq.${ctx.emotion},emotion.is.null`);
  } else {
    query = query.is("emotion", null);
  }

  // Filter by coach if provided
  if (ctx.coachId) {
    query = query.or(`coach_id.eq.${ctx.coachId},coach_id.is.null`);
  } else {
    query = query.is("coach_id", null);
  }

  // Filter by pattern if provided
  if (ctx.patternType && ctx.patternKey) {
    query = query.or(
      `pattern_type.eq.${ctx.patternType},pattern_key.eq.${ctx.patternKey},pattern_type.is.null`
    );
  }

  // Filter by risk score threshold
  if (ctx.riskScore !== null && ctx.riskScore !== undefined) {
    query = query.or(`min_risk_score.lte.${ctx.riskScore},min_risk_score.is.null`);
  }

  const { data: triggers } = await query;

  if (!triggers || triggers.length === 0) {
    return null;
  }

  // Score triggers by specificity (more specific = better)
  const scored = triggers.map((trigger: any) => {
    let score = 0;
    const reasons: string[] = [];

    if (trigger.risk_type && trigger.risk_type === ctx.riskType) {
      score += 3;
      reasons.push(`matches risk type: ${ctx.riskType}`);
    }
    if (trigger.emotion && trigger.emotion === ctx.emotion) {
      score += 2;
      reasons.push(`matches emotion: ${ctx.emotion}`);
    }
    if (trigger.coach_id && trigger.coach_id === ctx.coachId) {
      score += 2;
      reasons.push(`matches coach: ${ctx.coachId}`);
    }
    if (trigger.pattern_type && trigger.pattern_type === ctx.patternType) {
      score += 1;
      reasons.push(`matches pattern: ${ctx.patternType}`);
    }

    return {
      trigger,
      intervention: trigger.interventions,
      score,
      reasons: reasons.join(", "),
    };
  });

  // Sort by score and pick best
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (!best || !best.intervention || !best.intervention.active) {
    return null;
  }

  return {
    intervention: best.intervention as Intervention,
    reason: best.reasons || "General intervention match",
  };
}

/**
 * Log intervention execution
 */
export async function logInterventionExecution(params: {
  userId: string;
  interventionKey: string;
  coachId?: string;
  triggerSource: string;
  riskType?: string | null;
  emotion?: string | null;
  accepted?: boolean;
  completed?: boolean;
  xpAwarded?: number;
}): Promise<string> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", params.userId)
    .single();

  const dbUserId = userRow?.id || params.userId;

  const { data: execution, error } = await supabaseAdmin
    .from("intervention_executions")
    .insert({
      user_id: dbUserId,
      intervention_key: params.interventionKey,
      coach_id: params.coachId || null,
      trigger_source: params.triggerSource,
      risk_type: params.riskType || null,
      emotion: params.emotion || null,
      accepted: params.accepted ?? null,
      completed: params.completed ?? null,
      xp_awarded: params.xpAwarded || 0,
      completed_at: params.completed ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[InterventionEngine] Failed to log execution:", error);
    throw error;
  }

  return execution.id;
}

/**
 * Update intervention execution
 */
export async function updateInterventionExecution(
  executionId: string,
  updates: {
    accepted?: boolean;
    completed?: boolean;
    xpAwarded?: number;
  }
): Promise<void> {
  const updateData: any = {};

  if (updates.accepted !== undefined) {
    updateData.accepted = updates.accepted;
  }
  if (updates.completed !== undefined) {
    updateData.completed = updates.completed;
    if (updates.completed) {
      updateData.completed_at = new Date().toISOString();
    }
  }
  if (updates.xpAwarded !== undefined) {
    updateData.xp_awarded = updates.xpAwarded;
  }

  const { error } = await supabaseAdmin
    .from("intervention_executions")
    .update(updateData)
    .eq("id", executionId);

  if (error) {
    console.error("[InterventionEngine] Failed to update execution:", error);
    throw error;
  }
}

