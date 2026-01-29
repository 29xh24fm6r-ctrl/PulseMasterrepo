// tools/pulse_write.ts
// Write primitives for core Pulse tables.
// Canon rules:
//   - user_id auto-injected server-side (from target_user_id)
//   - never throw on infra errors — return structured status
//   - no retries inside handlers

import { z } from "zod";
import { getSupabase } from "../supabase.js";

// ============================================
// memory.add — writes to pulse_memory_events
// ============================================

const memoryAddSchema = z.object({
  target_user_id: z.string().min(10),
  content: z.string().min(1),
  memory_type: z
    .enum(["insight", "decision", "preference", "fact", "observation"])
    .default("observation"),
  source: z.string().default("mcp"),
  importance: z.number().min(0).max(1).default(0.5),
  metadata: z.record(z.unknown()).default({}),
});

export async function addMemoryEvent(input: unknown): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const parsed = memoryAddSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { target_user_id, content, memory_type, source, importance, metadata } =
    parsed.data;

  const { data, error } = await getSupabase()
    .from("pulse_memory_events")
    .insert({
      user_id: target_user_id,
      content,
      memory_type,
      source,
      importance,
      meta: metadata,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data.id };
}

// ============================================
// decision.record — writes to pulse_decisions
// ============================================

const decisionRecordSchema = z.object({
  target_user_id: z.string().min(10),
  decision: z.string().min(1),
  reasoning: z.string().optional(),
  alternatives: z.array(z.unknown()).default([]),
  source: z.string().default("mcp"),
  metadata: z.record(z.unknown()).default({}),
});

export async function recordDecision(input: unknown): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const parsed = decisionRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { target_user_id, decision, reasoning, alternatives, source, metadata } =
    parsed.data;

  const { data, error } = await getSupabase()
    .from("pulse_decisions")
    .insert({
      user_id: target_user_id,
      decision,
      reasoning: reasoning ?? null,
      alternatives,
      source,
      meta: metadata,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data.id };
}

// ============================================
// trigger.upsert — writes to pulse_trigger_candidates
// ============================================

const triggerUpsertSchema = z.object({
  target_user_id: z.string().min(10),
  trigger_type: z.string().min(1),
  message: z.string().min(1),
  source_type: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export async function upsertTrigger(input: unknown): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const parsed = triggerUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { target_user_id, trigger_type, message, source_type, metadata } =
    parsed.data;

  // Check for existing pending trigger of same type + message
  const { data: existing } = await getSupabase()
    .from("pulse_trigger_candidates")
    .select("id")
    .eq("user_id", target_user_id)
    .eq("trigger_type", trigger_type)
    .eq("message", message)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update existing trigger's metadata
    const { error } = await getSupabase()
      .from("pulse_trigger_candidates")
      .update({ meta: metadata, detected_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, id: existing.id };
  }

  // Insert new trigger
  const { data, error } = await getSupabase()
    .from("pulse_trigger_candidates")
    .insert({
      user_id: target_user_id,
      trigger_type,
      message,
      source_type: source_type ?? null,
      status: "pending",
      meta: metadata,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data.id };
}

// ============================================
// trust.state_set — writes to pulse_trust_state
// ============================================

const trustStateSetSchema = z.object({
  target_user_id: z.string().min(10),
  autonomy_level: z.number().int().min(0).max(5),
  trust_score: z.number().min(0).max(1).optional(),
});

export async function setTrustState(input: unknown): Promise<{
  ok: boolean;
  error?: string;
}> {
  const parsed = trustStateSetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { target_user_id, autonomy_level, trust_score } = parsed.data;

  const { error } = await getSupabase()
    .from("pulse_trust_state")
    .upsert({
      user_id: target_user_id,
      autonomy_level,
      trust_score: trust_score ?? 0.5,
      level_granted_at: new Date().toISOString(),
      level_granted_by: "mcp",
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
