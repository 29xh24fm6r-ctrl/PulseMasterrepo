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

  // Drafts that are active (approval queue)
  const { data, error } = await sb
    .from("email_suggested_drafts")
    .select("id,kind,to_email,subject,body,created_at,why,context,source_event_id")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // keep payload light (same sanitize as before)
  const drafts = (data ?? []).map((d: any) => ({
    ...d,
    context:
      d?.context && typeof d.context === "object"
        ? {
            thread_summary: typeof d.context.thread_summary === "string" ? d.context.thread_summary : null,
            ai: d.context.ai ?? null,
          }
        : null,
  }));

  return NextResponse.json({ ok: true, drafts });
}

