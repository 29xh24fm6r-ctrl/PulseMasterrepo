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

    // Only cancel queued or running jobs
    if (job.status !== "queued" && job.status !== "running") {
      return NextResponse.json({ ok: false, error: "Can only cancel queued or running jobs" }, { status: 400 });
    }

    const lastError = reason ? `Canceled by user: ${reason}` : "Canceled by user";

    const { error } = await supabaseAdmin
      .from("job_queue")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: lastError,
        locked_at: null,
        locked_by: null,
      })
      .eq("id", jobId);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Log cancel event
    await jobEvent(jobId, "warn", "canceled", { reason: reason || null });

    return NextResponse.json({ ok: true, job_id: jobId, status: "failed" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

