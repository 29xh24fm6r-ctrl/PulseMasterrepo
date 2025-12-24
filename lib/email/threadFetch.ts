import { supabaseAdmin } from "@/lib/supabase/admin";

export type EmailEventLite = {
  id: string;
  direction: string;
  message_id: string | null;
  thread_id: string | null;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string | null;
};

export async function fetchThreadContextByEventId(opts: {
  userId: string;
  sourceEventId: string;
  maxEvents: number;
}) {
  const sb = supabaseAdmin();

  const { data: ev, error: evErr } = await sb
    .from("email_events")
    .select("id,direction,message_id,thread_id,from_email,to_email,subject,snippet,received_at,references,in_reply_to,triage_label,triage_confidence")
    .eq("id", opts.sourceEventId)
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (evErr) throw new Error(`email_events_lookup_failed:${evErr.message}`);
  if (!ev) throw new Error("source_event_not_found");

  // If no thread_id, just return the single event as context
  let events: EmailEventLite[] = [
    {
      id: String(ev.id),
      direction: String(ev.direction ?? ""),
      message_id: ev.message_id ? String(ev.message_id) : null,
      thread_id: ev.thread_id ? String(ev.thread_id) : null,
      from_email: ev.from_email ? String(ev.from_email) : null,
      to_email: ev.to_email ? String(ev.to_email) : null,
      subject: ev.subject ? String(ev.subject) : null,
      snippet: ev.snippet ? String(ev.snippet) : null,
      received_at: ev.received_at ? String(ev.received_at) : null,
    },
  ];

  const threadId = ev.thread_id ? String(ev.thread_id) : null;

  if (threadId) {
    const { data: rows, error: thErr } = await sb
      .from("email_events")
      .select("id,direction,message_id,thread_id,from_email,to_email,subject,snippet,received_at")
      .eq("user_id", opts.userId)
      .eq("thread_id", threadId)
      .order("received_at", { ascending: false })
      .limit(opts.maxEvents);

    if (thErr) throw new Error(`email_thread_fetch_failed:${thErr.message}`);
    if (rows?.length) {
      events = rows.map((r: any) => ({
        id: String(r.id),
        direction: String(r.direction ?? ""),
        message_id: r.message_id ? String(r.message_id) : null,
        thread_id: r.thread_id ? String(r.thread_id) : null,
        from_email: r.from_email ? String(r.from_email) : null,
        to_email: r.to_email ? String(r.to_email) : null,
        subject: r.subject ? String(r.subject) : null,
        snippet: r.snippet ? String(r.snippet) : null,
        received_at: r.received_at ? String(r.received_at) : null,
      }));
    }
  }

  return {
    source: ev,
    thread_id: threadId,
    events,
  };
}

export function buildThreadSummary(events: EmailEventLite[]) {
  // deterministic mini-summary for the AI prompt (no model call)
  const lines = events
    .slice(0, 8)
    .map((e) => {
      const who = e.from_email || "unknown";
      const when = e.received_at ? safeDate(e.received_at) : "unknown time";
      const subj = (e.subject || "").trim();
      const snip = (e.snippet || "").trim().replace(/\s+/g, " ");
      return `- ${when} | ${who} | ${subj || "(no subject)"} | ${snip || "(no snippet)"}`;
    });

  return lines.join("\n");
}

function safeDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

