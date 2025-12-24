import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { outbox_id } = (await req.json().catch(() => ({}))) as { outbox_id?: string };
  if (!outbox_id) return NextResponse.json({ ok: false, error: "missing_outbox_id" }, { status: 400 });

  const sb = supabaseAdmin();

  const { data: row, error: readErr } = await sb
    .from("email_outbox")
    .select("*")
    .eq("id", outbox_id)
    .maybeSingle();

  if (readErr) return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (String(row.user_id || "") !== userId) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const suggested = row.auto_fix_payload?.suggested;
  if (!suggested) return NextResponse.json({ ok: false, error: "no_suggestion" }, { status: 400 });

  // Get body_text from the row (may be stored as body_text, html, or body_html)
  const bodyText = row.body_text || row.html || row.body_html || "";

  const { data: inserted, error: insErr } = await sb
    .from("email_outbox")
    .insert({
      user_id: userId,
      status: "queued",
      email_thread_id: row.email_thread_id || "",
      to_email: suggested,
      subject: row.subject,
      body_text: bodyText,
      safe_checksum: row.safe_checksum || "",
      safe_mode: row.safe_mode ?? true,
      in_reply_to: row.in_reply_to ?? null,
      references: row.references ?? null,
      attempt_count: 0,
      next_attempt_at: null,
      last_error: null,
      failure_code: null,
      auto_fix_suggested: false,
      auto_fix_payload: null,
      evidence: {
        ...(typeof row.evidence === "object" ? row.evidence : {}),
        source: "auto_fix_resend",
        original_outbox_id: outbox_id,
      },
    })
    .select("id")
    .single();

  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, new_outbox_id: inserted.id, to: suggested });
}
