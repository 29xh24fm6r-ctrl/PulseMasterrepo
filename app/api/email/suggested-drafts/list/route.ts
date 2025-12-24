import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeContext(ctx: any) {
  if (!ctx || typeof ctx !== "object") return null;

  const summary = typeof ctx.thread_summary === "string" ? ctx.thread_summary : null;

  // keep only top 3 events to avoid heavy payload
  const events = Array.isArray(ctx.thread_events)
    ? ctx.thread_events.slice(0, 3).map((e: any) => ({
        received_at: e?.received_at ?? null,
        from_email: e?.from_email ?? null,
        to_email: e?.to_email ?? null,
        subject: e?.subject ?? null,
        snippet: e?.snippet ?? null,
        direction: e?.direction ?? null,
      }))
    : null;

  const ai =
    ctx.ai && typeof ctx.ai === "object"
      ? { model: ctx.ai.model ?? null, generated_at: ctx.ai.generated_at ?? null, rewritten_at: ctx.ai.rewritten_at ?? null }
      : null;

  return { thread_summary: summary, thread_events: events, ai };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("email_suggested_drafts")
    .select("id,kind,to_email,subject,body,created_at,why,context")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const drafts = (data ?? []).map((d: any) => ({
    ...d,
    context: sanitizeContext(d.context),
  }));

  return NextResponse.json({ ok: true, drafts });
}
