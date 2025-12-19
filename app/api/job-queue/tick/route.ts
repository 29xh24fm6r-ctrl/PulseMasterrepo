import "server-only";
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { runOneJob } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const lockedBy =
      process.env.VERCEL_REGION
        ? `vercel:${process.env.VERCEL_REGION}`
        : `local:${process.pid}`;

    const results: any[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await runOneJob({ userId: supabaseUserId, lockedBy, lockSeconds: 300 });
      results.push(r);
      if (!r.ran) break;
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}
