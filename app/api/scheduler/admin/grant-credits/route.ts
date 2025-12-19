import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const user_id = body?.user_id as string | undefined; // UUID
    const delta = body?.delta as number | undefined;
    const reason = (body?.reason as string | undefined) ?? "grant";

    if (!user_id || !Number.isFinite(delta)) {
      return NextResponse.json(
        { ok: false, error: "user_id and delta are required" },
        { status: 400 }
      );
    }

    const day = new Date().toISOString().slice(0, 10);

    const { error } = await supabaseAdmin.rpc("job_queue_apply_credits", {
      p_user_id: user_id,
      p_day: day,
      p_delta: delta,
      p_reason: reason,
      p_job_id: null,
      p_meta: {},
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

