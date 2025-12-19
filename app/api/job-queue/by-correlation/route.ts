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
    const correlationId = url.searchParams.get("correlation_id");

    if (!correlationId) {
      return NextResponse.json({ ok: false, error: "Missing correlation_id" }, { status: 400 });
    }

    const { data: jobs, error } = await supabaseAdmin
      .from("job_queue")
      .select("id,user_id,job_type,status,priority,attempts,max_attempts,run_at,scheduled_at,started_at,finished_at,last_error,created_at,updated_at,correlation_id,idempotency_key,payload,lane,cost")
      .eq("user_id", supabaseUserId)
      .eq("correlation_id", correlationId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Verify ownership (all jobs should have same user_id, but double-check)
    const unauthorized = jobs?.some(j => j.user_id !== supabaseUserId);
    if (unauthorized) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, jobs: jobs ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

