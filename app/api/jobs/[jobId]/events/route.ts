import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
    }

    // Verify job ownership
    const { supabaseUserId } = await resolveSupabaseUser();
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("job_queue")
      .select("id, user_id")
      .eq("id", jobId)
      .eq("user_id", supabaseUserId)
      .maybeSingle();

    if (jobErr || !job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    // Fetch events from compatibility view
    const { data, error } = await supabaseAdmin
      .from("job_queue_events_c9")
      .select(`job_id, at, event, level, message, meta`)
      .eq("job_id", jobId)
      .order("at", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, jobId, events: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

