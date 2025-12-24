import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ensureSuggestedDraftForEvent } from "@/lib/email/suggestedDrafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generates drafts for latest inbound emails matching triage filter.
 * Dedupe is enforced by ensureSuggestedDraftForEvent + partial unique index.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    filter?: string; // triage_label
    limit?: number;
    tone?: string;
    goal?: string;
  };

  const filter = String(body.filter || "needs_reply");
  const limit = Math.max(1, Math.min(25, Number(body.limit || 10)));

  const sb = supabaseAdmin();

  let q = sb
    .from("email_events")
    .select("id,received_at,triage_label,direction")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .order("received_at", { ascending: false })
    .limit(limit);

  if (filter !== "all") q = q.eq("triage_label", filter);

  const { data: events, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const results: any[] = [];

  for (const ev of events ?? []) {
    try {
      const r = await ensureSuggestedDraftForEvent({
        userId,
        sourceEventId: String(ev.id),
        kind: "reply",
        tone: body.tone,
        goal: body.goal,
      });
      results.push({ event_id: ev.id, ok: true, ...r });
    } catch (e: any) {
      results.push({ event_id: ev.id, ok: false, error: e?.message || "failed" });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

