// src/app/api/email/followups/schedule/route.ts
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

type Body = { threadId: string; follow_up_at: string; reason?: string };

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as Body;
    if (!body?.threadId) throw new Error("missing_threadId");
    if (!body?.follow_up_at) throw new Error("missing_follow_up_at");

    const sb = sbEmailAdmin();

    const { error } = await sb.from("email_followups").insert({
      user_id: userId,
      thread_id: body.threadId,
      follow_up_at: body.follow_up_at,
      reason: body.reason ?? "follow_up",
      status: "scheduled",
    });
    if (error) throw error;

    // also update triage to suggested if not done
    await sb
      .from("email_triage_items")
      .update({ state: "suggested", suggested_action: "followup" })
      .eq("user_id", userId)
      .eq("email_thread_id", body.threadId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}

