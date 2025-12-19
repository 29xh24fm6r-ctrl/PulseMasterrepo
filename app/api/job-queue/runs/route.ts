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
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);

    // Use RPC for grouping (atomic, efficient)
    const { data: runs, error } = await supabaseAdmin.rpc("job_queue_runs", {
      p_user_id: supabaseUserId,
      p_limit: limit,
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Optionally enrich with job types (separate query for sample)
    const enrichedRuns = await Promise.all(
      (runs ?? []).map(async (run) => {
        const { data: jobTypes } = await supabaseAdmin
          .from("job_queue")
          .select("job_type")
          .eq("user_id", supabaseUserId)
          .eq("correlation_id", run.correlation_id)
          .limit(5);

        const uniqueTypes = Array.from(new Set((jobTypes ?? []).map((j) => j.job_type).filter(Boolean)));

        return {
          correlation_id: run.correlation_id,
          last_ts: run.last_ts,
          counts: {
            queued: run.queued,
            running: run.running,
            succeeded: run.succeeded,
            failed: run.failed,
          },
          sample_job_types: uniqueTypes,
        };
      })
    );

    return NextResponse.json({ ok: true, runs: enrichedRuns });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

