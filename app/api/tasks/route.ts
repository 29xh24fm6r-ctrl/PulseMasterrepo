// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dbToUiTaskStatus, uiToDbTaskStatus } from "@/lib/pulse/normalizeTaskStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(); // ✅ supports PULSE_DEV_USER_ID in dev
    const sp = supabaseAdmin;

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status"); // UI sends "Todo" | "In Progress" | "Done"
    const dbStatus = uiToDbTaskStatus(statusParam);

    // In dev mode with non-UUID user_id, return empty tasks (smoke test safe)
    if (!isValidUUID(userId)) {
      return NextResponse.json({ ok: true, tasks: [] });
    }

    let q = sp.from("tasks").select("*").eq("user_id", userId);

    if (dbStatus) q = q.eq("status", dbStatus);

    const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;

    const tasks = (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name ?? t.title ?? "Untitled",
      description: t.description ?? null,
      status: dbToUiTaskStatus(t.status ?? "todo"),
      priority: t.priority ?? "medium",
      dueDate: t.due_date ?? null,
      project: t.project ?? null,
      xp: t.xp ?? 0,
      completedAt: t.completed_at ?? null,
      createdAt: t.created_at ?? null,
      updatedAt: t.updated_at ?? null,
    }));

    return NextResponse.json({ ok: true, tasks });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
