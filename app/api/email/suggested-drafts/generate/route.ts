import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildReplySubject } from "@/lib/email/threadContext";
import { fetchThreadContextByEventId, buildThreadSummary } from "@/lib/email/threadFetch";
import { generateThreadAwareReply } from "@/lib/email/draftAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (String(process.env.EMAIL_AI_DRAFTING_ENABLED || "false") !== "true") {
    return NextResponse.json({ ok: false, error: "ai_drafting_disabled" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    event_id?: string;
    tone?: string;
    goal?: string;
  };

  const eventId = String(body?.event_id || "");
  if (!eventId) return NextResponse.json({ ok: false, error: "missing_event_id" }, { status: 400 });

  const sb = supabaseAdmin();
  const maxEvents = Math.max(1, Math.min(20, Number(process.env.EMAIL_AI_MAX_THREAD_EVENTS || 6)));

  // Load thread context
  const thread = await fetchThreadContextByEventId({
    userId,
    sourceEventId: eventId,
    maxEvents,
  });

  const subj = buildReplySubject(String(thread.source.subject || "(no subject)"));
  const toEmail = String(thread.source.from_email || "");

  if (!toEmail) return NextResponse.json({ ok: false, error: "missing_to_email" }, { status: 400 });

  const summary = buildThreadSummary(thread.events);

  const ai = await generateThreadAwareReply({
    userTone: body.tone,
    goal: body.goal,
    toEmail,
    subject: subj,
    sourceSnippet: String(thread.source.snippet || ""),
    threadSummary: summary,
  });

  const checksum = simpleChecksum({
    to_email: toEmail,
    subject: ai.subject,
    body: ai.body,
    kind: "reply",
    source_event_id: eventId,
    model: ai.model,
  });

  const context = {
    source_event_id: eventId,
    thread_id: thread.thread_id,
    max_events: maxEvents,
    thread_events: thread.events,
    thread_summary: summary,
    ai: {
      model: ai.model,
      generated_at: new Date().toISOString(),
    },
  };

  const { data: inserted, error: insErr } = await sb
    .from("email_suggested_drafts")
    .insert({
      user_id: userId,
      source_event_id: eventId,
      kind: "reply",
      to_email: toEmail,
      subject: ai.subject,
      body: ai.body,
      why: ai.why,
      context,
      safe_checksum: checksum,
      active: true,
    })
    .select("id")
    .single();

  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, draft_id: inserted.id });
}

function simpleChecksum(obj: any) {
  const json = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < json.length; i++) hash = (hash * 31 + json.charCodeAt(i)) >>> 0;
  return String(hash);
}

