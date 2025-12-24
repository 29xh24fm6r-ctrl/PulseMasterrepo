// src/app/api/email/draft/generate/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sbEmailAdmin } from "@/lib/email/db";
import { upsertTriageFromInbound } from "@/lib/email/ingestToTriage";
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

type Body = { threadId: string };

function buildDeterministicDraft(subject: string, lastInbound: string, fromEmail: string) {
  const cleanSubject = subject?.trim() ? subject.trim() : "Re:";
  const body = `Hi ${fromEmail || "there"},\n\nThanks for your note. Quick update:\n\n- \n\nIf you can confirm the details above, I'll proceed.\n\nBest,\n`;

  return { subject: cleanSubject.startsWith("Re:") ? cleanSubject : `Re: ${cleanSubject}`, body };
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const json = (await req.json()) as Body;
    if (!json?.threadId) throw new Error("missing_threadId");

    const sb = sbEmailAdmin();

    const { data: thread, error: tErr } = await sb
      .from("email_threads")
      .select("id, subject")
      .eq("user_id", userId)
      .eq("id", json.threadId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!thread) throw new Error("thread_not_found");

    // last inbound message
    const { data: lastInbound, error: mErr } = await sb
      .from("email_messages")
      .select("subject, body_text, from_email, sent_at")
      .eq("user_id", userId)
      .eq("thread_id", json.threadId)
      .eq("direction", "inbound")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (mErr) throw mErr;
    if (!lastInbound) throw new Error("no_inbound_message");

    const draft = buildDeterministicDraft(
      lastInbound.subject ?? thread.subject ?? "Re:",
      lastInbound.body_text ?? "",
      lastInbound.from_email ?? ""
    );

    const { data: ins, error: iErr } = await sb
      .from("email_drafts")
      .insert({
        user_id: userId,
        thread_id: json.threadId,
        subject: draft.subject,
        body: draft.body,
        status: "draft",
      })
      .select("id, subject, body, status, created_at, updated_at")
      .single();
    if (iErr) throw iErr;

    // Update triage to suggested state (using the new upsert function)
    try {
      await upsertTriageFromInbound({
        userId,
        emailThreadId: json.threadId,
        subject: lastInbound.subject ?? thread.subject ?? null,
        snippet: thread.snippet ?? null,
        fromEmail: lastInbound.from_email ?? null,
        hasAttachments: false,
        receivedAt: lastInbound.sent_at ?? null,
      });
    } catch (triageErr) {
      // Don't fail draft generation if triage update fails
      console.warn("[draft/generate] Triage update error:", triageErr);
    }

    return NextResponse.json({ ok: true, draft: ins });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}

