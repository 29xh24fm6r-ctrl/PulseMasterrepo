import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id, minutes } = (await req.json().catch(() => ({}))) as { id?: string; minutes?: number };
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const m = clamp(Number(minutes || 60), 5, 7 * 24 * 60);
  const next = new Date(Date.now() + m * 60 * 1000).toISOString();

  const sb = supabaseAdmin();

  // Get current snooze_count first
  const { data: current } = await sb
    .from("reminder_subscriptions")
    .select("snooze_count")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  const newSnoozeCount = Number(current?.snooze_count ?? 0) + 1;

  const { error } = await sb
    .from("reminder_subscriptions")
    .update({
      next_run_at: next,
      snooze_count: newSnoozeCount,
      last_snoozed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, next_run_at: next });
}

