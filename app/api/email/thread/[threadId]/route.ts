// src/app/api/email/thread/[threadId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sbEmailAdmin } from "@/lib/email/db";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ threadId: string }> | { threadId: string } }
) {
  try {
    const resolvedParams = ctx.params instanceof Promise ? await ctx.params : ctx.params;
    const threadId = resolvedParams.threadId;
    const userId = await requireUserId();

    const sb = sbEmailAdmin();

    const { data: thread, error: tErr } = await sb
      .from("email_threads")
      .select("*")
      .eq("user_id", userId)
      .eq("id", threadId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!thread) throw new Error("thread_not_found");

    const { data: messages, error: mErr } = await sb
      .from("email_messages")
      .select("id, direction, from_email, to_emails, sent_at, subject, body_text, created_at")
      .eq("user_id", userId)
      .eq("thread_id", threadId)
      .order("sent_at", { ascending: true });
    if (mErr) throw mErr;

    const { data: triage, error: triErr } = await sb
      .from("email_triage_items")
      .select("*")
      .eq("user_id", userId)
      .eq("email_thread_id", threadId)
      .maybeSingle();
    if (triErr) throw triErr;

    const { data: drafts, error: dErr } = await sb
      .from("email_drafts")
      .select("id, subject, body, status, updated_at, created_at")
      .eq("user_id", userId)
      .eq("thread_id", threadId)
      .order("updated_at", { ascending: false })
      .limit(10);
    if (dErr) throw dErr;

    const { data: followups, error: fErr } = await sb
      .from("email_followups")
      .select("id, follow_up_at, reason, status, created_at, updated_at")
      .eq("user_id", userId)
      .eq("thread_id", threadId)
      .order("follow_up_at", { ascending: true });
    if (fErr) throw fErr;

    return NextResponse.json({ ok: true, thread, messages: messages ?? [], triage: triage ?? null, drafts: drafts ?? [], followups: followups ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}

