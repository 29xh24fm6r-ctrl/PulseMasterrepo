import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { FEATURE_REGISTRY } from "@/lib/features/registry";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "GET /api/ops/analytics" });

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access (optional - you can remove if you want all users to see analytics)
    const adminIds = process.env.PULSE_ADMIN_CLERK_IDS?.split(",").map((s) => s.trim()) || [];
    if (!adminIds.includes(userId)) {
      return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Page views
    const { data: pageViews } = await supabaseAdmin
      .from("pulse_events")
      .select("feature_id")
      .eq("event_name", "page_view")
      .gte("created_at", since);

    // API calls
    const { data: apiCalls } = await supabaseAdmin
      .from("pulse_events")
      .select("feature_id")
      .eq("event_name", "api_call")
      .gte("created_at", since);

    // Gate blocks
    const { data: gateBlocks } = await supabaseAdmin
      .from("pulse_events")
      .select("feature_id, properties")
      .eq("event_name", "gate_block")
      .gte("created_at", since);

    // Aggregate by feature
    const featureMap = new Map<string, string>();
    for (const f of FEATURE_REGISTRY) {
      featureMap.set(f.id, f.name);
    }

    const pageViewCounts = new Map<string, number>();
    for (const pv of pageViews || []) {
      const fid = pv.feature_id || "unknown";
      pageViewCounts.set(fid, (pageViewCounts.get(fid) || 0) + 1);
    }

    const apiCallCounts = new Map<string, number>();
    for (const ac of apiCalls || []) {
      const fid = ac.feature_id || "unknown";
      apiCallCounts.set(fid, (apiCallCounts.get(fid) || 0) + 1);
    }

    const gateBlockCounts = new Map<string, { count: number; reason: string }>();
    for (const gb of gateBlocks || []) {
      const fid = gb.feature_id || "unknown";
      const reason = (gb.properties as any)?.reason || "Not allowed";
      const existing = gateBlockCounts.get(fid);
      gateBlockCounts.set(fid, {
        count: (existing?.count || 0) + 1,
        reason: existing?.reason || reason,
      });
    }

    const pageViewsOut = Array.from(pageViewCounts.entries())
      .map(([id, count]) => ({
        feature_id: id,
        feature_name: featureMap.get(id) || id,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const apiCallsOut = Array.from(apiCallCounts.entries())
      .map(([id, count]) => ({
        feature_id: id,
        feature_name: featureMap.get(id) || id,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const gateBlocksOut = Array.from(gateBlockCounts.entries())
      .map(([id, data]) => ({
        feature_id: id,
        feature_name: featureMap.get(id) || id,
        count: data.count,
        reason: data.reason,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    log.info("route.ok", { ...meta, route: "GET /api/ops/analytics", ms: Date.now() - t0 });
    return NextResponse.json({
      ok: true,
      data: {
        pageViews: pageViewsOut,
        apiCalls: apiCallsOut,
        gateBlocks: gateBlocksOut,
      },
    });
  } catch (err: any) {
    log.error("route.err", { ...meta, route: "GET /api/ops/analytics", ms: Date.now() - t0, error: err?.message || String(err) });
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

