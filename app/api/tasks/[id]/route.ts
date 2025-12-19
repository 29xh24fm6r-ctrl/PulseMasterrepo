import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "PATCH /api/tasks/[id]", taskId: params.id });

  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const nextStatus = body.status;

    if (!id || !nextStatus) {
      log.warn("route.validation_failed", { ...meta, route: "PATCH /api/tasks/[id]", ms: Date.now() - t0, error: "Missing id or status" });
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update({ 
        status: nextStatus, 
        completed_at: nextStatus === "completed" ? new Date().toISOString() : null 
      })
      .eq("id", id)
      .eq("user_id", supabaseUserId)
      .select("*")
      .single();

    if (error) {
      log.error("route.err", { ...meta, route: "PATCH /api/tasks/[id]", ms: Date.now() - t0, error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    log.info("route.ok", { ...meta, route: "PATCH /api/tasks/[id]", ms: Date.now() - t0, taskId: id, status: nextStatus });
    return NextResponse.json({ ok: true, task: data });
  } catch (err: any) {
    log.error("route.err", { ...meta, route: "PATCH /api/tasks/[id]", ms: Date.now() - t0, error: err?.message || String(err) });
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
