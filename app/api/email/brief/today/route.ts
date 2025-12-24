// src/app/api/email/brief/today/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildDailyBrief } from "@/lib/email/dailyBrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUserId(): Promise<string> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  // Resolve Clerk ID to DB user_id
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  return userRow?.id ?? clerkUserId;
}

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const sb = supabaseAdmin;

    const day = todayKey();

    // If stored brief exists, return it
    const { data: existing, error: exErr } = await sb
      .from("email_daily_briefs")
      .select("id, content, day")
      .eq("user_id", userId)
      .eq("day", day)
      .maybeSingle();
    if (exErr) throw exErr;

    if (existing?.content) {
      return NextResponse.json({
        ok: true,
        day,
        bullets: existing.content.split("\n").filter(Boolean),
        cached: true,
      });
    }

    // Otherwise compute
    const { data: triage, error: tErr } = await sb
      .from("email_triage_items")
      .select("email_thread_id, urgency, suggested_action, next_action_at")
      .eq("user_id", userId)
      .neq("state", "done")
      .limit(200);
    if (tErr) throw tErr;

    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: followups, error: fErr } = await sb
      .from("email_followups")
      .select("email_thread_id, follow_up_at, reason")
      .eq("user_id", userId)
      .eq("status", "scheduled")
      .lte("follow_up_at", soon)
      .order("follow_up_at", { ascending: true })
      .limit(50);
    if (fErr) throw fErr;

    // Map triage items to expected format
    const triageFormatted = (triage ?? []).map((t: any) => ({
      email_thread_id: t.email_thread_id,
      urgency: t.urgency,
      suggested_action: t.suggested_action,
      next_action_at: t.next_action_at,
    }));

    const followupsFormatted = (followups ?? []).map((f: any) => ({
      email_thread_id: f.email_thread_id,
      follow_up_at: f.follow_up_at,
      reason: f.reason,
    }));

    const bullets = buildDailyBrief(triageFormatted, followupsFormatted);
    const content = bullets.join("\n");

    // Store it (best effort)
    const { error: insErr } = await sb.from("email_daily_briefs").insert({ user_id: userId, day, content });
    if (insErr) {
      // don't fail response if insert fails
    }

    return NextResponse.json({ ok: true, day, bullets, cached: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}

