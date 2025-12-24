// src/lib/email/db.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

export const sbEmailAdmin = () => supabaseAdmin;

export type TriageStatus = "new" | "suggested" | "waiting_on_someone" | "done" | "snoozed";
export type TriagePriority = "p0" | "p1" | "p2";
export type SuggestedAction = "reply" | "task" | "followup" | "ignore";

export function nowIso() {
  return new Date().toISOString();
}

export function clampPriority(p?: string | null): TriagePriority {
  if (p === "p0" || p === "p1" || p === "p2") return p;
  return "p1";
}

export function clampStatus(s?: string | null): TriageStatus {
  if (s === "new" || s === "suggested" || s === "waiting_on_someone" || s === "done" || s === "snoozed") return s;
  return "new";
}

export function clampSuggestedAction(a?: string | null): SuggestedAction {
  if (a === "reply" || a === "task" || a === "followup" || a === "ignore") return a;
  return "reply";
}

