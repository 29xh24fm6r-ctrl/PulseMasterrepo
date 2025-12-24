// src/app/api/email/tick/missing-replies/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Missing-replies safety net:
 * If needs_reply=true and no outbound in last X hours → bump to suggested.
 * Also escalates overdue due_at to p0.
 *
 * Admin route: protect behind your admin auth in production.
 */
export async function POST(req: Request) {
  const sb = supabaseAdmin;
  const url = new URL(req.url);

  const hours = Math.max(1, Math.min(72, Number(url.searchParams.get("hours") || 2)));
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") || 200)));

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // candidates: items that need reply (suggested_action === 'reply') and are not done
  const { data: items, error } = await sb
    .from("email_triage_items")
    .select("id, user_id, email_thread_id, suggested_action, state, urgency, next_action_at, updated_at")
    .eq("suggested_action", "reply")
    .neq("state", "done")
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  let bumped = 0;
  let escalated = 0;

  for (const it of items ?? []) {
    // Check if needs bump (no reply sent recently - we'd need to check email_messages, but for now use updated_at)
    // If item was updated more than X hours ago and still needs reply, bump to suggested
    const itemUpdated = it.updated_at ? new Date(it.updated_at).getTime() : 0;
    const needsBump = itemUpdated < new Date(cutoff).getTime();

    const nextActionAt = it.next_action_at as string | null;
    const overdue = !!nextActionAt && nextActionAt < nowIso;

    const patch: any = {};
    if (needsBump && it.state !== "suggested") {
      patch.state = "suggested";
      bumped++;
    }
    if (overdue && it.urgency !== "p0") {
      patch.urgency = "p0";
      escalated++;
    }

    if (Object.keys(patch).length) {
      await sb.from("email_triage_items").update(patch).eq("id", it.id);
    }
  }

  return NextResponse.json({ ok: true, bumped, escalated, checked: (items ?? []).length });
}

