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
    id?: string;
    tone?: string;
    goal?: string;
  };

  const id = String(body?.id || "");
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

  const sourceEventId = draft.source_event_id ? String(draft.source_event_id) : "";
  if (!sourceEventId) return NextResponse.json({ ok: false, error: "missing_source_event_id" }, { status: 400 });

  const maxEvents = Math.max(1, Math.min(20, Number(process.env.EMAIL_AI_MAX_THREAD_EVENTS || 6)));

  const thread = await fetchThreadContextByEventId({
    userId,
    sourceEventId,
    maxEvents,
  });

  const subj = buildReplySubject(String(thread.source.subject || draft.subject || "(no subject)"));
  const toEmail = String(draft.to_email || thread.source.from_email || "");
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
    kind: String(draft.kind || "reply"),
    source_event_id: sourceEventId,
    model: ai.model,
  });

  const nextContext = {
    ...(typeof draft.context === "object" && draft.context ? draft.context : {}),
    source_event_id: sourceEventId,
    thread_id: thread.thread_id,
    max_events: maxEvents,
    thread_events: thread.events,
    thread_summary: summary,
    ai: {
      model: ai.model,
      rewritten_at: new Date().toISOString(),
    },
  };

  const { error: upErr } = await sb
    .from("email_suggested_drafts")
    .update({
      subject: ai.subject,
      body: ai.body,
      why: ai.why,
      context: nextContext,
      safe_checksum: checksum,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

function simpleChecksum(obj: any) {
  const json = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < json.length; i++) hash = (hash * 31 + json.charCodeAt(i)) >>> 0;
  return String(hash);
}

