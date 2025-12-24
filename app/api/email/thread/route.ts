// src/app/api/email/thread/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/email/thread?email_thread_id=...
 *
 * Returns:
 * { ok: true, thread: { email_thread_id, subject?, participants?, messages: [...] } }
 *
 * This route is intentionally defensive:
 * - uses email_thread_id only
 * - tries to read from a likely messages table
 * - if not available, returns ok:false with a clear error
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const email_thread_id = url.searchParams.get("email_thread_id")?.trim();

  if (!email_thread_id) {
    return NextResponse.json({ ok: false, error: "missing_email_thread_id" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // ---- Best-effort message fetch ----
  // Try a common table name. If your schema uses a different one,
  // change ONLY this section. The UI will keep working.
  //
  // Expected (loosely):
  // - email_thread_id (string)
  // - subject/snippet/body_text/body_html
  // - from_name/from_email/to_email
  // - received_at/sent_at/created_at
  // Try to fetch message_id and references if available (may not exist in all schemas)
  const { data, error } = await sb
    .from("email_messages")
    .select(
      [
        "id",
        "email_thread_id",
        "subject",
        "snippet",
        "body_text",
        "body_html",
        "from_name",
        "from_email",
        "to_email",
        "direction",
        "received_at",
        "sent_at",
        "created_at",
        "message_id",
        "headers",
      ].join(",")
    )
    .eq("email_thread_id", email_thread_id)
    .order("received_at", { ascending: true, nullsLast: true })
    .order("sent_at", { ascending: true, nullsLast: true })
    .order("created_at", { ascending: true, nullsLast: true });

  if (error) {
    // Clear, honest error for fast wiring if table name differs
    return NextResponse.json(
      {
        ok: false,
        error: "thread_fetch_failed",
        detail: error.message,
        hint:
          'If your messages table is not "email_messages", update src/app/api/email/thread/route.ts to query the correct table.',
      },
      { status: 500 }
    );
  }

  const messages = (data || []).map((m: any) => {
    const when = m.received_at || m.sent_at || m.created_at || null;
    
    // Extract message_id from message_id column or headers
    let message_id = m.message_id ?? null;
    if (!message_id && m.headers) {
      // If headers is JSONB, try to extract Message-Id
      if (typeof m.headers === "object") {
        message_id = m.headers["message-id"] || m.headers["Message-Id"] || null;
      } else if (typeof m.headers === "string") {
        // If headers is a string, try to parse it
        try {
          const parsed = JSON.parse(m.headers);
          message_id = parsed["message-id"] || parsed["Message-Id"] || null;
        } catch {}
      }
    }
    
    return {
      id: String(m.id ?? ""),
      email_thread_id: String(m.email_thread_id ?? email_thread_id),
      subject: m.subject ?? null,
      snippet: m.snippet ?? null,
      body_text: m.body_text ?? null,
      body_html: m.body_html ?? null,
      from_name: m.from_name ?? null,
      from_email: m.from_email ?? null,
      to_email: m.to_email ?? null,
      direction: m.direction ?? null,
      when,
      message_id: message_id ? String(message_id) : null,
    };
  });

  const subject =
    messages.find((x: any) => typeof x?.subject === "string" && x.subject.trim().length)?.subject ?? null;

  // ---- Outbox status (best-effort) ----
  const { data: outboxRows, error: outErr } = await sb
    .from("email_outbox")
    .select("id,status,error,created_at")
    .eq("email_thread_id", email_thread_id)
    .order("created_at", { ascending: false })
    .limit(5);

  const outbox = (outErr ? [] : outboxRows || []).map((o: any) => ({
    id: String(o.id ?? ""),
    status: String(o.status ?? ""),
    error: o.error ?? null,
    created_at: o.created_at ?? null,
  }));

  return NextResponse.json({
    ok: true,
    thread: {
      email_thread_id,
      subject,
      messages,
      outbox,
    },
  });
}

