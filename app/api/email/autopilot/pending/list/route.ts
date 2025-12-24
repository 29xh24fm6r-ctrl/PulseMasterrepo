import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autopilotEnabled } from "@/lib/email/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!autopilotEnabled()) return NextResponse.json({ ok: false, error: "autopilot_disabled" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("email_outbox")
    .select("id,status,send_intent,scheduled_send_at,undo_until,to_email,subject")
    .eq("user_id", userId)
    .eq("status", "pending_send")
    .order("scheduled_send_at", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data ?? [] });
}

