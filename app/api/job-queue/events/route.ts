import "server-only";
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { supabaseUserId } = await resolveSupabaseUser();
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json({ ok: false, error: "Missing job_id" }, { status: 400 });
    }

    // Ownership check
    const { data: job, error: jErr } = await supabaseAdmin
      .from("job_queue")
      .select("id,user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jErr) return NextResponse.json({ ok: false, error: jErr.message }, { status: 500 });
    if (!job?.id || job.user_id !== supabaseUserId) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("job_queue_events")
      .select("id,ts,level,message,meta")
      .eq("job_id", jobId)
      .order("ts", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, events: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

