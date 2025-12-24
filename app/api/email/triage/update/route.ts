import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanitizeTriageDecision } from "@/lib/email/triageDecision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canonical Triage Update (WRITE)
 * Updates ONLY public.email_triage_items
 *
 * Body:
 * {
 *   triage_id: string,
 *   patch: {
 *     urgency?: 'p0'|'p1'|'p2'|'p3'
 *     suggested_action?: 'reply'|'followup'|'task'|'ignore'
 *     state?: 'triaged'|'suggested'|'done'
 *     score?: number|null
 *     next_action_at?: string|null
 *     why?: string|null
 *     evidence?: object
 *   }
 * }
 */
export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Resolve Clerk ID to DB user_id
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  const userId = userRow?.id ?? clerkUserId;

  const sb = supabaseAdmin;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const triageId = String(body?.triage_id || "");
  if (!triageId) return NextResponse.json({ error: "missing_triage_id" }, { status: 400 });

  const patch = body?.patch ?? {};
  const clean = sanitizeTriageDecision({
    urgency: patch.urgency,
    suggested_action: patch.suggested_action,
    state: patch.state,
    score: patch.score,
    next_action_at: patch.next_action_at,
    why: patch.why,
    evidence: patch.evidence,
  });

  // Build payload ONLY from allowed fields
  const payload: Record<string, any> = {
    urgency: clean.urgency,
    suggested_action: clean.suggested_action,
    state: clean.state,
    score: clean.score,
    next_action_at: clean.next_action_at,
    why: clean.why,
    evidence: clean.evidence ?? {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("email_triage_items")
    .update(payload)
    .eq("id", triageId)
    .eq("user_id", userId)
    .select(
      "id, user_id, email_thread_id, urgency, suggested_action, state, score, next_action_at, why, evidence, updated_at"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: data });
}
