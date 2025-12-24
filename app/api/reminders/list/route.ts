import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  // Get active reminders that are due (next_run_at <= now)
  const { data, error } = await sb
    .from("reminder_subscriptions")
    .select("id,title,body,severity,source_type,source_id,kind,next_run_at,created_at,snooze_count")
    .eq("user_id", userId)
    .eq("active", true)
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, reminders: data ?? [] });
}

