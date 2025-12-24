import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit, autopilotEnabled } from "@/lib/email/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!autopilotEnabled()) return NextResponse.json({ ok: false, error: "autopilot_disabled" }, { status: 400 });

  const { outbox_id, reason } = (await req.json().catch(() => ({}))) as { outbox_id?: string; reason?: string };
  if (!outbox_id) return NextResponse.json({ ok: false, error: "missing_outbox_id" }, { status: 400 });

  const sb = supabaseAdmin();

  const { data: row, error } = await sb
    .from("email_outbox")
    .select("id,status,undo_until,source_draft_id")
    .eq("id", outbox_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (String(row.status) !== "pending_send") {
    return NextResponse.json({ ok: false, error: "not_pending_send" }, { status: 400 });
  }

  const undoUntil = row.undo_until ? new Date(String(row.undo_until)).getTime() : 0;
  if (undoUntil && Date.now() > undoUntil) {
    return NextResponse.json({ ok: false, error: "undo_window_expired" }, { status: 400 });
  }

  const { error: upErr } = await sb
    .from("email_outbox")
    .update({ status: "canceled", cancel_reason: reason || "user_undo" })
    .eq("id", outbox_id)
    .eq("user_id", userId)
    .eq("status", "pending_send");

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  await audit(userId, outbox_id, "undo", { reason: reason || "user_undo" });

  return NextResponse.json({ ok: true });
}

