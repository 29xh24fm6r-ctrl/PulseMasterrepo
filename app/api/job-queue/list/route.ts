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

    const status = url.searchParams.get("status");
    const lane = url.searchParams.get("lane");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);

    let q = supabaseAdmin
      .from("job_queue")
      .select("id,user_id,job_type,status,priority,attempts,max_attempts,run_at,scheduled_at,started_at,finished_at,last_error,created_at,updated_at,correlation_id,idempotency_key,payload,lane,cost")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) q = q.eq("status", status);
    if (lane) q = q.eq("lane", lane);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, jobs: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: e?.status ?? 500 });
  }
}

