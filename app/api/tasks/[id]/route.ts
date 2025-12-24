// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { uiToDbTaskStatus } from "@/lib/pulse/normalizeTaskStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const userId = await requireUserId();
    const sp = supabaseAdmin;
    const params = await Promise.resolve(ctx.params);
    const id = params.id;

    const body = await req.json().catch(() => ({}));
    const nextStatus = uiToDbTaskStatus(body?.status ?? null);

    const update: any = {};
    if (nextStatus) {
      update.status = nextStatus;
      if (nextStatus === "done") update.completed_at = new Date().toISOString();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await sp.from("tasks").update(update).eq("id", id).eq("user_id", userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
