import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";
import { generateProactiveInterventions, storeIntervention } from "@/lib/proactive/engine";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "POST /api/cron/proactive" });

  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    // Generate + store (best-effort), then return a compact "insights" format your hook expects
    try {
      const interventions = await generateProactiveInterventions(supabaseUserId);
      for (const i of interventions) {
        try {
          await storeIntervention(supabaseUserId, i);
        } catch (e) {
          // Best-effort storage, continue on error
          console.warn("Failed to store intervention:", e);
        }
      }
    } catch (e) {
      // Best-effort generation, continue to fetch existing
      console.warn("Failed to generate interventions:", e);
    }

    // Fetch existing pending interventions
    const { data } = await supabaseAdmin
      .from("proactive_interventions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    const insights = (data || []).map((x: any) => ({
      id: x.id,
      type: x.type || "task",
      priority: x.priority || "medium",
      title: x.title || "Proactive suggestion",
      message: x.message || x.description || "",
      icon: x.icon || "sparkles",
      action: x.action_href ? { label: x.action_label || "Open", href: x.action_href } : undefined,
      timestamp: x.created_at || new Date().toISOString(),
    }));

    log.info("route.ok", { ...meta, route: "POST /api/cron/proactive", ms: Date.now() - t0, count: insights.length });
    return NextResponse.json({ ok: true, suppressed: false, insights });
  } catch (err: any) {
    log.error("route.err", { ...meta, route: "POST /api/cron/proactive", ms: Date.now() - t0, error: err?.message || String(err) });
    return NextResponse.json({ ok: false, suppressed: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

