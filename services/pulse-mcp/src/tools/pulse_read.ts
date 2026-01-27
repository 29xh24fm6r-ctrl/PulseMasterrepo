import { z } from "zod";
import { supabase } from "../supabase.js";
import { assertViewerCanReadTarget } from "../auth.js";

const targetSchema = z.object({
  target_user_id: z.string().min(10),
  limit: z.number().int().min(1).max(200).default(50),
});

export async function listSignals(input: unknown) {
  const { target_user_id, limit } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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

  const { data, error } = await supabase
    .from("pulse_confidence_events")
    .select("*")
    .eq("user_id", target_user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
