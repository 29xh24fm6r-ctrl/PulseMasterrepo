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
    const userId = url.searchParams.get("user_id");
    const today = new Date().toISOString().split("T")[0];

    // Current rate window
    const windowSeconds = 3600;
    const windowStartEpoch = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
    const windowStart = new Date(windowStartEpoch * 1000).toISOString();

    if (userId) {
      // Per-user fairness data
      const { data: budget, error: budgetErr } = await supabaseAdmin
        .from("job_queue_daily_budget")
        .select("*")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();

      const { data: rateWindow, error: rateErr } = await supabaseAdmin
        .from("job_queue_rate_window")
        .select("*")
        .eq("user_id", userId)
        .eq("window_start", windowStart)
        .eq("window_seconds", windowSeconds)
        .maybeSingle();

      const { data: laneQuotas, error: laneErr } = await supabaseAdmin
        .from("job_queue_lane_quota")
        .select("*")
        .eq("user_id", userId)
        .eq("day", today);

      return NextResponse.json({
        ok: true,
        user_id: userId,
        budget: budget ?? null,
        rate_window: rateWindow ?? null,
        lane_quotas: laneQuotas ?? [],
      });
    } else {
      // All users (today's data)
      const { data: budgets, error: budgetErr } = await supabaseAdmin
        .from("job_queue_daily_budget")
        .select("*")
        .eq("day", today)
        .order("spent", { ascending: false })
        .limit(100);

      const { data: rateWindows, error: rateErr } = await supabaseAdmin
        .from("job_queue_rate_window")
        .select("*")
        .eq("window_start", windowStart)
        .eq("window_seconds", windowSeconds)
        .order("spent", { ascending: false })
        .limit(100);

      const { data: laneQuotas, error: laneErr } = await supabaseAdmin
        .from("job_queue_lane_quota")
        .select("*")
        .eq("day", today)
        .order("spent", { ascending: false })
        .limit(200);

      return NextResponse.json({
        ok: true,
        budgets: budgets ?? [],
        rate_windows: rateWindows ?? [],
        lane_quotas: laneQuotas ?? [],
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

