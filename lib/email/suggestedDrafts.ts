import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildReplySubject, draftReplyBody, draftFollowUpBody } from "@/lib/email/threadContext";
import { fetchThreadContextByEventId, buildThreadSummary } from "@/lib/email/threadFetch";
import { generateThreadAwareReply } from "@/lib/email/draftAI";

type Kind = "reply" | "follow_up";

export async function ensureSuggestedDraftForEvent(opts: {
  userId: string;
  sourceEventId: string;
  kind: Kind;
  tone?: string;
  goal?: string;
}): Promise<{ created: boolean; draft_id?: string; reason?: string }> {
  const sb = supabaseAdmin();

  // Dedupe: if active draft exists, do nothing.
  const { data: existing, error: exErr } = await sb
    .from("email_suggested_drafts")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("source_event_id", opts.sourceEventId)
    .eq("kind", opts.kind)
    .eq("active", true)
    .maybeSingle();

  if (exErr) throw new Error(`suggested_drafts_lookup_failed:${exErr.message}`);
  if (existing?.id) return { created: false, draft_id: String(existing.id), reason: "already_exists" };

  const maxEvents = Math.max(1, Math.min(20, Number(process.env.EMAIL_AI_MAX_THREAD_EVENTS || 6)));

  const thread = await fetchThreadContextByEventId({
    userId: opts.userId,
    sourceEventId: opts.sourceEventId,
    maxEvents,
  });

  const toEmail = String(thread.source.from_email || "");
  if (!toEmail) throw new Error("missing_to_email");

  const subjectBase = String(thread.source.subject || "(no subject)");
  const subject = buildReplySubject(subjectBase);

  const summary = buildThreadSummary(thread.events);

  const aiEnabled = String(process.env.EMAIL_AI_DRAFTING_ENABLED || "false") === "true";

  let body = "";
  let why = "";
  let model: string | null = null;

  if (aiEnabled) {
    const goal =
      opts.goal ||
      (opts.kind === "follow_up"
        ? "Send a polite follow-up asking for an update and next steps."
        : "Reply helpfully and move the thread forward.");

    const ai = await generateThreadAwareReply({
      userTone: opts.tone,
      goal,
      toEmail,
      subject,
      sourceSnippet: String(thread.source.snippet || ""),
      threadSummary: summary,
    });

    body = ai.body;
    why = ai.why || "AI generated based on thread context.";
    model = ai.model || null;
  } else {
    // deterministic fallback
    body = opts.kind === "follow_up" ? draftFollowUpBody(asThreadContext(thread)) : draftReplyBody(asThreadContext(thread));
    why = "Deterministic draft (AI disabled).";
  }

  const checksum = simpleChecksum({
    to_email: toEmail,
    subject,
    body,
    kind: opts.kind,
    source_event_id: opts.sourceEventId,
    model: model || "deterministic",
  });

  const context = {
    source_event_id: opts.sourceEventId,
    thread_id: thread.thread_id,
    max_events: maxEvents,
    thread_events: thread.events,
    thread_summary: summary,
    ai: aiEnabled
      ? {
          model,
          generated_at: new Date().toISOString(),
        }
      : null,
  };

  const { data: inserted, error: insErr } = await sb
    .from("email_suggested_drafts")
    .insert({
      user_id: opts.userId,
      source_event_id: opts.sourceEventId,
      kind: opts.kind,
      to_email: toEmail,
      subject,
      body,
      why,
      context,
      safe_checksum: checksum,
      active: true,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(`suggested_drafts_insert_failed:${insErr.message}`);

  return { created: true, draft_id: String(inserted.id) };
}

function asThreadContext(thread: any) {
  return {
    from_email: String(thread?.source?.from_email || ""),
    to_email: String(thread?.source?.to_email || ""),
    subject: String(thread?.source?.subject || ""),
    snippet: String(thread?.source?.snippet || ""),
    received_at: String(thread?.source?.received_at || new Date().toISOString()),
    message_id: String(thread?.source?.message_id || ""),
    in_reply_to: thread?.source?.in_reply_to ?? null,
    references: Array.isArray(thread?.source?.references) ? thread.source.references : null,
  };
}

function simpleChecksum(obj: any) {
  const json = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < json.length; i++) hash = (hash * 31 + json.charCodeAt(i)) >>> 0;
  return String(hash);
}

