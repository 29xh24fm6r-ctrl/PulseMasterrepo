// tools/design_predictive_draft.ts
// Phase B: Predictive draft infrastructure.
// Creates inert screen proposals that sit parked until the user asks for them.
// prediction ≠ action — these never render, never notify, never execute.
// Canon: never throw, return structured status, no retries.

import crypto from "node:crypto";
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { buildContext, shape } from "../personhood/index.js";

// ============================================
// TYPES
// ============================================

export interface PredictiveMeta {
  trigger_signals: string[];
  confidence: number;
  intended_timeframe: "before_event" | "ongoing" | "after_event";
}

export type PredictiveDraftEventKind =
  | "predictive_design_drafted"
  | "predictive_design_viewed"
  | "predictive_design_ignored"
  | "predictive_design_approved";

// ============================================
// INPUT SCHEMA
// ============================================

const draftInputSchema = z.object({
  target_user_id: z.string().min(10),
  screen_name: z.string().min(1),
  intent: z.string().min(1),
  proposal: z.record(z.unknown()),
  predictive_meta: z.object({
    trigger_signals: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    intended_timeframe: z.enum(["before_event", "ongoing", "after_event"]),
  }),
});

const viewInputSchema = z.object({
  proposal_id: z.string().uuid(),
  target_user_id: z.string().min(10),
});

// ============================================
// OBSERVER LOGGING
// ============================================

async function logPredictiveEvent(
  userId: string,
  kind: PredictiveDraftEventKind,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: kind,
      payload: { ...meta, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the tool call if logging fails
  }
}

// ============================================
// CREATE PREDICTIVE DRAFT
// ============================================

export async function createPredictiveDraft(input: unknown): Promise<{
  ok: boolean;
  proposal_id?: string;
  presented_text?: string;
  presented_meta?: {
    posture: string;
    familiarity: number;
    lint_violations: string[];
  };
  error?: string;
}> {
  const parsed = draftInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { target_user_id, screen_name, intent, proposal, predictive_meta } =
    parsed.data;

  try {
    // Write inert draft to pulse_proposals
    const callId = `predictive-${crypto.randomUUID()}`;
    const { data, error } = await getSupabase()
      .from("pulse_proposals")
      .insert({
        call_id: callId,
        tool: "design.propose_screen",
        scope: "propose",
        agent: "design_intelligence",
        intent,
        inputs: {
          proposal_type: "ui_predictive_draft",
          screen_name,
          predictive_meta,
          proposal,
        },
        status: "parked",
        verdict: "require_human",
        user_id: target_user_id,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    // Shape the presentation text
    const rawText =
      "I drafted something you might want later. No pressure — want to look, or should I keep it parked?";

    let presentedText = rawText;
    let presentedMeta:
      | { posture: string; familiarity: number; lint_violations: string[] }
      | undefined;

    try {
      const personCtx = await buildContext(target_user_id, {
        autonomy_level: 0,
        trust_score: 0.5,
        proposal_type: "ui_predictive_draft",
        recent_interaction_type: "design",
      });
      const shaped = shape(rawText, personCtx);
      presentedText = shaped.text;
      presentedMeta = {
        posture: shaped.posture,
        familiarity: shaped.familiarity_level,
        lint_violations: shaped.lint_result.violations,
      };
    } catch {
      // Use raw text
    }

    // Log observer event (non-blocking)
    logPredictiveEvent(target_user_id, "predictive_design_drafted", {
      proposal_id: data.id,
      screen_name,
      confidence: predictive_meta.confidence,
      intended_timeframe: predictive_meta.intended_timeframe,
      trigger_signal_count: predictive_meta.trigger_signals.length,
    }).catch(() => {});

    return {
      ok: true,
      proposal_id: data.id,
      presented_text: presentedText,
      presented_meta: presentedMeta,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Unknown error creating predictive draft",
    };
  }
}

// ============================================
// LIFECYCLE EVENT HELPERS
// ============================================

/**
 * Record that a user viewed a predictive draft.
 * Called when a parked draft is surfaced to the user.
 */
export async function markPredictiveDraftViewed(input: unknown): Promise<{
  ok: boolean;
  error?: string;
}> {
  const parsed = viewInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { proposal_id, target_user_id } = parsed.data;

  logPredictiveEvent(target_user_id, "predictive_design_viewed", {
    proposal_id,
  }).catch(() => {});

  return { ok: true };
}

/**
 * Record that a user explicitly ignored a predictive draft.
 * The draft stays parked but we stop re-surfacing it.
 */
export async function markPredictiveDraftIgnored(input: unknown): Promise<{
  ok: boolean;
  error?: string;
}> {
  const parsed = viewInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { proposal_id, target_user_id } = parsed.data;

  try {
    await getSupabase()
      .from("pulse_proposals")
      .update({ status: "dismissed" })
      .eq("id", proposal_id);
  } catch {
    // Non-critical
  }

  logPredictiveEvent(target_user_id, "predictive_design_ignored", {
    proposal_id,
  }).catch(() => {});

  return { ok: true };
}

/**
 * Record that a user approved a predictive draft.
 * Promotes the draft from "parked" to "pending" for standard approval flow.
 */
export async function markPredictiveDraftApproved(input: unknown): Promise<{
  ok: boolean;
  error?: string;
}> {
  const parsed = viewInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { proposal_id, target_user_id } = parsed.data;

  try {
    await getSupabase()
      .from("pulse_proposals")
      .update({ status: "pending" })
      .eq("id", proposal_id);
  } catch {
    // Non-critical
  }

  logPredictiveEvent(target_user_id, "predictive_design_approved", {
    proposal_id,
  }).catch(() => {});

  return { ok: true };
}
