import { supabaseAdmin } from "@/lib/supabase/admin";
import { decideTriageFromInbound } from "./triageRules";
import { sanitizeTriageDecision } from "./triageDecision";

export async function upsertTriageFromInbound(args: {
  userId: string;
  emailThreadId: string; // INTERNAL uuid
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  hasAttachments: boolean;
  receivedAt: string | null;
}) {
  const sb = supabaseAdmin;

  // 1) Load existing (to preserve done state unless newer inbound)
  const { data: existing, error: exErr } = await sb
    .from("email_triage_items")
    .select("id, state, updated_at, next_action_at")
    .eq("user_id", args.userId)
    .eq("email_thread_id", args.emailThreadId)
    .maybeSingle();

  if (exErr) throw exErr;

  const decision = decideTriageFromInbound({
    subject: args.subject,
    snippet: args.snippet,
    from_email: args.fromEmail,
    has_attachments: args.hasAttachments,
    received_at: args.receivedAt,
  });

  const clean = sanitizeTriageDecision(decision);

  const doneLocked = existing?.state === "done";

  // If item was done, do NOT resurrect unless we have a newer receivedAt
  // (We treat receivedAt as authoritative; if missing, preserve done.)
  let shouldResurrect = false;
  if (doneLocked && args.receivedAt) {
    const received = new Date(args.receivedAt).getTime();
    const updated = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
    shouldResurrect = received > updated;
  }

  const finalState = doneLocked && !shouldResurrect ? "done" : clean.state;

  const payload = {
    user_id: args.userId,
    email_thread_id: args.emailThreadId,

    urgency: clean.urgency,
    suggested_action: clean.suggested_action,

    // DB types:
    why: clean.why, // text
    evidence: clean.evidence ?? {}, // jsonb object

    score: clean.score,
    next_action_at: clean.next_action_at,
    state: finalState,

    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("email_triage_items")
    .upsert(payload, { onConflict: "user_id,email_thread_id" })
    .select("id")
    .single();

  if (error) throw error;

  return data;
}
