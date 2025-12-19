import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = (await req.json().catch(() => ({}))) as {
      priority_bump?: number;
      lane?: string;
    };

    const { data, error } = await supabaseAdmin.rpc("job_queue_sla_escalate_c9", {
      p_priority_bump: body.priority_bump ?? 50,
      p_lane_when_breached: body.lane ?? "fast",
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, updated: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

