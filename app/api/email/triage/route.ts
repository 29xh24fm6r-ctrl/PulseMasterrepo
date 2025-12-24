import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canonical Triage List (READ)
 * Source of truth: public.email_triage_inbox_v
 *
 * Query params:
 * - state: triaged | suggested | done
 * - urgency: p0 | p1 | p2 | p3
 * - suggested_action: reply | followup | task | ignore
 * - limit: 1..200 (default 50)
 */
export async function GET(req: Request) {
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
  const url = new URL(req.url);

  const state = url.searchParams.get("state");
  const urgency = url.searchParams.get("urgency");
  const suggestedAction = url.searchParams.get("suggested_action");
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 50)));

  let q = sb
    .from("email_triage_inbox_v")
    .select(
      [
        "triage_id",
        "user_id",
        "email_thread_id",
        "urgency",
        "suggested_action",
        "state",
        "score",
        "next_action_at",
        "why",
        "evidence",
        "triage_updated_at",
        "subject",
        "snippet",
        "from_email",
        "last_message_at",
      ].join(",")
    )
    .eq("user_id", userId)
    .order("triage_updated_at", { ascending: false })
    .limit(limit);

  if (state) q = q.eq("state", state);
  if (urgency) q = q.eq("urgency", urgency);
  if (suggestedAction) q = q.eq("suggested_action", suggestedAction);

  const { data, error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    items: (data ?? []).map((row: any) => ({
      // canonical fields
      triage_id: row.triage_id,
      email_thread_id: row.email_thread_id,
      urgency: row.urgency,
      suggested_action: row.suggested_action,
      state: row.state,
      score: row.score,
      next_action_at: row.next_action_at,
      why: row.why,
      evidence: row.evidence ?? {},

      // thread fields for UI
      subject: row.subject,
      snippet: row.snippet,
      from_email: row.from_email,
      last_message_at: row.last_message_at,

      // convenience (derived; NOT stored)
      needs_reply: row.suggested_action === "reply",
    })),
  });
}
