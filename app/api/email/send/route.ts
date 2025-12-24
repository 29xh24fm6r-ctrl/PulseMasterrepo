// src/app/api/email/send/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Evidence = Record<string, unknown>;

function sha256(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function isObj(x: any): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  const email_thread_id = body?.email_thread_id ? String(body.email_thread_id).trim() : "";
  const to_email = body?.to_email ? String(body.to_email).trim() : "";
  const subject = body?.subject ? String(body.subject).trim() : "";
  const body_text = body?.body_text ? String(body.body_text) : "";
  const safe_checksum = body?.safe_checksum ? String(body.safe_checksum).trim() : "";
  
  // NEW: thread headers (optional)
  const in_reply_to = body?.in_reply_to ? String(body.in_reply_to).trim() || null : null;
  const references = Array.isArray(body?.references) 
    ? body.references.map((r: any) => String(r).trim()).filter(Boolean)
    : null;

  const evidence: Evidence = isObj(body?.evidence) ? body.evidence : { source: "compose_ui" };

  if (!email_thread_id) return NextResponse.json({ ok: false, error: "missing_email_thread_id" }, { status: 400 });
  if (!to_email) return NextResponse.json({ ok: false, error: "missing_to_email" }, { status: 400 });
  if (!subject) return NextResponse.json({ ok: false, error: "missing_subject" }, { status: 400 });
  if (!body_text?.trim()) return NextResponse.json({ ok: false, error: "missing_body_text" }, { status: 400 });
  if (!safe_checksum) {
    return NextResponse.json(
      { ok: false, error: "missing_safe_checksum", hint: "Call /api/email/draft first (or compute checksum server-side)." },
      { status: 400 }
    );
  }
  if (!isObj(evidence)) {
    return NextResponse.json({ ok: false, error: "invalid_evidence_object" }, { status: 400 });
  }

  // Verify SAFE MODE checksum matches content (prevents client tampering).
  // IMPORTANT: include thread headers in the checksum so they can't be tampered with client-side.
  // Checksum format v: 2 (matches draft route)
  const expected = sha256(
    JSON.stringify({
      email_thread_id,
      to_email,
      subject,
      body_text,
      in_reply_to: in_reply_to ?? null,
      references: references ?? null,
      v: 2,
    })
  );

  if (expected !== safe_checksum) {
    return NextResponse.json(
      {
        ok: false,
        error: "safe_checksum_mismatch",
        hint: "Draft content changed after checksum was issued. Re-run AI Draft (or regenerate checksum) before sending.",
      },
      { status: 400 }
    );
  }

  // Queue email in outbox (best-effort)
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("email_outbox")
    .insert({
      user_id: userId,
      email_thread_id,
      to_email,
      subject,
      body_text,
      safe_checksum,
      safe_mode: true,
      status: "queued",
      in_reply_to,
      references,
      evidence,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "outbox_insert_failed",
        detail: error.message,
        hint: 'Ensure table "email_outbox" exists (see 20251221_email_outbox_safe_mode.sql).',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    queued: {
      outbox_id: data?.id ? String(data.id) : null,
      email_thread_id,
      to_email,
      subject,
      safe_mode: true,
      status: "queued",
    },
  });
}

