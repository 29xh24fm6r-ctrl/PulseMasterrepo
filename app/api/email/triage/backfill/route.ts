import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { upsertTriageFromInbound } from "@/lib/email/ingestToTriage";

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

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get("limit") || 200)));

    const sb = supabaseAdmin;

    const { data: threads, error } = await sb
      .from("email_threads")
      .select("id, subject, snippet, last_message_from, last_message_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let ok = 0;
    let failed = 0;

    for (const t of threads ?? []) {
      try {
        await upsertTriageFromInbound({
          userId,
          emailThreadId: String(t.id),
          subject: t.subject ?? null,
          snippet: t.snippet ?? null,
          fromEmail: t.last_message_from ?? null,
          hasAttachments: false, // Would need message data for this
          receivedAt: t.last_message_at ?? null,
        });
        ok++;
      } catch (e) {
        failed++;
        console.error("triage_backfill_failed", { threadId: t.id, err: String(e) });
      }
    }

    return NextResponse.json({
      ok: true,
      triageUpsertsOk: ok,
      triageUpsertsFailed: failed,
      scanned: (threads ?? []).length,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}
