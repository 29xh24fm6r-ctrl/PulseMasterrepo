import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200", 10), 1000);

    const userId = url.searchParams.get("user_id"); // optional UUID
    const decision = url.searchParams.get("decision"); // optional

    let q = supabaseAdmin
      .from("job_queue_scheduler_decisions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) q = q.eq("user_id", userId);
    if (decision) q = q.eq("decision", decision);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

