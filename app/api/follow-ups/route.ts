import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";
import { withApiAnalytics } from "@/lib/analytics/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApiAnalytics(req, async () => {
    const meta = getRequestMeta();
    const t0 = Date.now();
    log.info("route.start", { ...meta, route: "GET /api/follow-ups" });

    try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Number(searchParams.get("limit") || "50");

    let q = supabaseAdmin.from("follow_ups").select("*").eq("user_id", supabaseUserId).limit(limit);
    if (status) {
      q = q.eq("status", status);
    }

    const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      log.error("route.err", { ...meta, route: "GET /api/follow-ups", ms: Date.now() - t0, error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const followUps = (data || []).map((f: any) => ({
      id: f.id,
      contact_name: f.person_name ?? f.contact_name ?? f.name ?? "Unknown",
      reason: f.type ?? f.reason ?? "follow_up",
      due_date: f.due_date ?? null,
      status: f.status ?? "pending",
    }));

      log.info("route.ok", { ...meta, route: "GET /api/follow-ups", ms: Date.now() - t0, count: followUps.length });
      return NextResponse.json({ followUps });
    } catch (err: any) {
      log.error("route.err", { ...meta, route: "GET /api/follow-ups", ms: Date.now() - t0, error: err?.message || String(err) });
      return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
    }
  });
}
