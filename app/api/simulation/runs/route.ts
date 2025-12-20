// app/api/simulation/runs/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClerkUserId } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/simulation/runs
 * Query params:
 * - limit (default 20, max 100)
 * - status (optional) started|finished|failed
 */
export async function GET(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    
    // Resolve to database user ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();

    const dbUserId = userRow?.id || clerkUserId;

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 20)));
    const status = url.searchParams.get("status");

    let q = supabaseAdmin
      .from("simulation_runs")
      .select(
        "id,user_id,request_id,route,mode,deal_id,path_ids,status,started_at,finished_at,duration_ms,error"
      )
      .eq("user_id", dbUserId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (status) {
      q = q.eq("status", status);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, runs: data ?? [] }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || "Failed to load runs";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

