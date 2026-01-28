import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { assertViewerCanReadTarget } from "../auth.js";

const targetSchema = z.object({
  target_user_id: z.string().min(10),
  limit: z.number().int().min(1).max(200).default(50),
});

export async function listSignals(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_signals")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listDrafts(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_drafts")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listOutcomes(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_outcomes")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listReviewRequests(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_review_requests")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listExecutionLog(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_execution_log")
    .select("*")
    .eq("user_id", target_user_id)
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listObserverEvents(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_observer_events")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listConfidenceEvents(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_confidence_events")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ============================================
// PHASE 2: MEMORY TOOLS
// ============================================

const memorySchema = z.object({
  target_user_id: z.string().min(10),
  limit: z.number().int().min(1).max(200).default(50),
  memory_type: z.string().optional(),
});

export async function listMemoryEvents(input: unknown) {
  const { target_user_id, limit, memory_type } = memorySchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  let query = getSupabase()
    .from("pulse_memory_events")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (memory_type) {
    query = query.eq("memory_type", memory_type);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listRecentMemory(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_memory_events")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 20)); // Cap at 20 for "recent"

  if (error) throw new Error(error.message);
  return data ?? [];
}

const searchSchema = z.object({
  target_user_id: z.string().min(10),
  limit: z.number().int().min(1).max(200).default(50),
  query: z.string().min(1),
});

export async function searchMemory(input: unknown) {
  const { target_user_id, limit, query } = searchSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_memory_events")
    .select("*")
    .eq("user_id", target_user_id)
    .textSearch("content", query, { type: "websearch" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ============================================
// PHASE 5: DECISION TOOLS
// ============================================

export async function listDecisions(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_decisions")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listRecentDecisions(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_decisions")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 10)); // Cap at 10 for "recent"

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ============================================
// PHASE 6: TRUST STATE
// ============================================

export async function getTrustState(input: unknown) {
  const { target_user_id } = z.object({
    target_user_id: z.string().min(10),
  }).parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await getSupabase()
    .from("pulse_trust_state")
    .select("*")
    .eq("user_id", target_user_id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  // Return default state if not found
  return data ?? {
    user_id: target_user_id,
    autonomy_level: 0,
    trust_score: 0.5,
    level_granted_at: null,
    level_granted_by: null,
  };
}

// ============================================
// PHASE 4: TRIGGER CANDIDATES
// ============================================

const triggerSchema = z.object({
  target_user_id: z.string().min(10),
  limit: z.number().int().min(1).max(200).default(50),
  status: z.string().optional(),
});

export async function listTriggerCandidates(input: unknown) {
  const { target_user_id, limit, status } = triggerSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  let query = getSupabase()
    .from("pulse_trigger_candidates")
    .select("*")
    .eq("user_id", target_user_id)
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ============================================
// PHASE 7: CONTEXT SNAPSHOT
// ============================================

export async function getCurrentContext(input: unknown) {
  const { target_user_id } = z.object({
    target_user_id: z.string().min(10),
  }).parse(input);
  await assertViewerCanReadTarget(target_user_id);

  // Parallel fetch of all context components
  const [
    trustState,
    recentMemory,
    recentSignals,
    pendingTriggers,
    recentDecisions,
  ] = await Promise.all([
    getTrustState({ target_user_id }).catch(() => ({ autonomy_level: 0, trust_score: 0.5 })),
    listRecentMemory({ target_user_id, limit: 5 }).catch(() => []),
    listSignals({ target_user_id, limit: 5 }).catch(() => []),
    listTriggerCandidates({ target_user_id, limit: 5, status: "pending" }).catch(() => []),
    listRecentDecisions({ target_user_id, limit: 3 }).catch(() => []),
  ]);

  return {
    user_id: target_user_id,
    timestamp: new Date().toISOString(),
    trust: {
      autonomy_level: (trustState as any).autonomy_level ?? 0,
      trust_score: (trustState as any).trust_score ?? 0.5,
    },
    recent_memory: recentMemory,
    recent_signals: recentSignals,
    pending_triggers: pendingTriggers,
    recent_decisions: recentDecisions,
  };
}
