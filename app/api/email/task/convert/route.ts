// src/app/api/email/task/convert/route.ts
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

type Body = { threadId: string; title?: string; due_at?: string | null };

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as Body;
    if (!body?.threadId) throw new Error("missing_threadId");

    const sb = sbEmailAdmin();

    // Get thread subject for a good task title
    const { data: thread, error: tErr } = await sb
      .from("email_threads")
      .select("id, subject, snippet")
      .eq("user_id", userId)
      .eq("id", body.threadId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!thread) throw new Error("thread_not_found");

    const title = (body.title?.trim() || thread.subject?.trim() || "Email follow-up").slice(0, 140);
    const notes = `From Email Thread: ${body.threadId}\n\n${thread.snippet ?? ""}`.trim();

    // Create task (assumes you have public.tasks table)
    // If your task table is named differently, adjust here to your canonical tasks table.
    const taskInsert: any = {
      user_id: userId,
      title,
      notes,
      status: "open",
    };
    if (body.due_at) taskInsert.due_at = body.due_at;

    const { data: task, error: taskErr } = await sb.from("tasks").insert(taskInsert).select("id").single();
    if (taskErr) throw taskErr;

    // Update triage to reflect task created
    await sb
      .from("email_triage_items")
      .update({ suggested_action: "task", state: "suggested" })
      .eq("user_id", userId)
      .eq("email_thread_id", body.threadId);

    return NextResponse.json({ ok: true, taskId: task.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}

