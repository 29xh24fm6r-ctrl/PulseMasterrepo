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
    log.info("route.start", { ...meta, route: "GET /api/tasks" });

    try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // e.g. pending|completed
    const limit = Number(searchParams.get("limit") || "50");

    let q = supabaseAdmin.from("tasks").select("*").eq("user_id", supabaseUserId).limit(limit);

    if (status) {
      q = q.eq("status", status);
    }

    const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      log.error("route.err", { ...meta, route: "GET /api/tasks", ms: Date.now() - t0, error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tasks = (data || []).map((t: any) => ({
      id: t.id,
      title: t.title ?? t.name ?? "Untitled",
      status: t.status ?? "pending",
      priority: t.priority ?? "medium",
      due_date: t.due_date ?? t.dueDate ?? null,
    }));

      log.info("route.ok", { ...meta, route: "GET /api/tasks", ms: Date.now() - t0, count: tasks.length });
      return NextResponse.json({ tasks });
    } catch (err: any) {
      log.error("route.err", { ...meta, route: "GET /api/tasks", ms: Date.now() - t0, error: err?.message || String(err) });
      return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
    }
  });
}
