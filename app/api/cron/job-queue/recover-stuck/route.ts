import "server-only";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    requireCronSecret(req);

    const url = new URL(req.url);
    const lockAgeSeconds = Math.min(parseInt(url.searchParams.get("age_seconds") || "600", 10) || 600, 3600);

    const { data, error } = await supabaseAdmin.rpc("job_queue_recover_stuck", {
      p_lock_age_seconds: lockAgeSeconds,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const recovered = (data as number | undefined) ?? 0;

    return NextResponse.json({
      ok: true,
      recovered,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

