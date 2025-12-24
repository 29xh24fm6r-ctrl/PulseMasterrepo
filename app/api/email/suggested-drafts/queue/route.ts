import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const sb = supabaseAdmin();

  const { data: draft, error: dErr } = await sb
    .from("email_suggested_drafts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });
  if (!draft) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Get thread metadata from source event if available
  let inReplyTo: string | null = null;
  let references: string[] | null = null;
  let emailThreadId = "";

  if (draft.source_event_id) {
    const { data: event } = await sb
      .from("email_events")
      .select("message_id,thread_id")
      .eq("id", draft.source_event_id)
      .maybeSingle();

    if (event?.message_id) {
      inReplyTo = event.message_id;
      references = event.message_id ? [event.message_id] : null;
      emailThreadId = event.thread_id || event.message_id || "";
    }
  }

  // Queue into outbox (Safe-mode already enforced by server-side generation; we keep it immutable by copying exactly)
  const { data: out, error: oErr } = await sb
    .from("email_outbox")
    .insert({
      user_id: userId,
      email_thread_id: emailThreadId || draft.source_event_id || "",
      status: "queued",
      to_email: String(draft.to_email),
      subject: String(draft.subject),
      html: String(draft.body),
      in_reply_to: inReplyTo,
      references,
      last_error: null,
      attempt_count: 0,
      next_attempt_at: null,
      auto_fix_suggested: false,
      auto_fix_payload: null,
      failure_code: null,
    })
    .select("id")
    .single();

  if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });

  // deactivate draft so it doesn't keep showing
  await sb.from("email_suggested_drafts").update({ active: false }).eq("id", id).eq("user_id", userId).catch(() => {});

  return NextResponse.json({ ok: true, outbox_id: out.id });
}

