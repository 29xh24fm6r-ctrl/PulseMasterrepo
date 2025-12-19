// app/api/ops/features/canary/runs/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Returns recent canary runs (latest first).
 * Uses service role (supabaseAdmin) so Ops always works.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(50, Number(limitRaw || "10") || 10));

    const { data, error } = await supabaseAdmin
      .from("feature_canary_runs")
      .select("id, feature_id, ok, severity, result, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      runs: (data || []).map((r: any) => ({
        id: r.id,
        featureId: r.feature_id,
        ok: r.ok,
        severity: r.severity,
        createdAt: r.created_at,
        result: r.result,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load canary runs" },
      { status: 500 }
    );
  }
}
