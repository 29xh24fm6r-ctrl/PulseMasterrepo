import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "POST /api/follow-ups/update-status" });

  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const { followUpId, status } = await req.json().catch(() => ({}));
    if (!followUpId || !status) {
      log.warn("route.validation_failed", { ...meta, route: "POST /api/follow-ups/update-status", ms: Date.now() - t0, error: "followUpId and status required" });
      return NextResponse.json({ ok: false, error: "followUpId and status required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("follow_ups")
      .update({ status, last_action_date: new Date().toISOString() })
      .eq("id", followUpId)
      .eq("user_id", supabaseUserId);

    if (error) {
      log.error("route.err", { ...meta, route: "POST /api/follow-ups/update-status", ms: Date.now() - t0, error: error.message });
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    log.info("route.ok", { ...meta, route: "POST /api/follow-ups/update-status", ms: Date.now() - t0, followUpId, status });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    log.error("route.err", { ...meta, route: "POST /api/follow-ups/update-status", ms: Date.now() - t0, error: err?.message || String(err) });
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

