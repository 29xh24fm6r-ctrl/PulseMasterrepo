// Alias /api/frontier/dashboard to /frontier/dashboard
import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "GET /api/frontier/dashboard" });

  try {
    const { userId } = await auth();
    if (!userId) {
      log.warn("route.auth_failed", { ...meta, route: "GET /api/frontier/dashboard", ms: Date.now() - t0 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseAdmin;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [nextActionRes, momentumRes, statesRes, profileRes, summaryRes] = await Promise.all([
      supabase.from("tasks").select("id, title, priority, due_date, status")
        .eq("user_id", userId).eq("status", "pending")
        .order("priority", { ascending: false }).order("due_date", { ascending: true })
        .limit(1).single(),
      supabase.from("id_momentum_daily").select("*")
        .eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("emo_states").select("detected_emotion, intensity, valence, occurred_at")
        .eq("user_id", userId).gte("occurred_at", weekAgo).order("occurred_at", { ascending: false }).limit(20),
      supabase.from("emo_profiles").select("*").eq("user_id", userId).single(),
      supabase.from("tb_daily_summaries").select("*").eq("user_id", userId).eq("date", yesterday).single(),
    ]);

    log.info("route.ok", { ...meta, route: "GET /api/frontier/dashboard", ms: Date.now() - t0 });
    return NextResponse.json({
      nextAction: nextActionRes.data,
      momentum: momentumRes.data || [],
      emotionData: {
        recentStates: statesRes.data || [],
        profile: profileRes.data,
      },
      summary: summaryRes.data,
    });
  } catch (error: any) {
    log.error("route.err", { ...meta, route: "GET /api/frontier/dashboard", ms: Date.now() - t0, error: error?.message || String(error) });
    console.error("Frontier dashboard error:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
