import "server-only";
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { jobEvent } from "@/lib/jobs/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await req.json().catch(() => ({}));
    const jobId = body?.job_id as string | undefined;
    const reason = body?.reason as string | undefined;

    if (!jobId) return NextResponse.json({ ok: false, error: "Missing job_id" }, { status: 400 });

    // Ensure ownership
    const { data: job, error: jErr } = await supabaseAdmin
      .from("job_queue")
      .select("id,user_id,status")
      .eq("id", jobId)
      .maybeSingle();

    if (jErr) return NextResponse.json({ ok: false, error: jErr.message }, { status: 500 });
    if (!job?.id || job.user_id !== supabaseUserId) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("job_queue")
      .update({
        status: "queued",
        run_at: now,
        locked_at: null,
        locked_by: null,
        started_at: null,
        finished_at: null,
        last_error: null,
      })
      .eq("id", jobId);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Log requeue event
    await jobEvent(jobId, "info", "requeued", { reason: reason || "Manual requeue" });

    return NextResponse.json({ ok: true, job_id: jobId, status: "queued" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: e?.status ?? 500 });
  }
}

